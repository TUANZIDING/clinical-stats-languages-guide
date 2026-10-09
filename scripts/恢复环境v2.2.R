# No activation file, .Rprofile, DESCRIPTION or default renv.lock is created.
# Explicit official lockfile/library interfaces; all writable state stays in build/.
args <- commandArgs(trailingOnly=TRUE)
action <- if (length(args)) args[[1]] else "restore"
root <- normalizePath(".")
lock <- file.path(root, "config", "R环境锁v2.2.json")
source.lib <- if (length(args)>2) normalizePath(args[[3]], mustWork=FALSE) else file.path(root, "build", "R包源环境v2.2")
library.path <- if (length(args)>1) normalizePath(args[[2]], mustWork=FALSE) else file.path(root,"build","R恢复环境v2.2")
project <- file.path(root,"build","R恢复项目v2.2")
dir.create(project, recursive=TRUE, showWarnings=FALSE)
Sys.setenv(RENV_PATHS_ROOT=file.path(project,"cache"), RENV_PATHS_RENV=file.path(project,"state"),
           RENV_CONFIG_AUTO_SNAPSHOT="FALSE", RENV_CONFIG_USER_PROFILE="FALSE")
options(repos=c(CRAN="https://cloud.r-project.org"))
dir.create(library.path, recursive=TRUE, showWarnings=FALSE)
dir.create(source.lib, recursive=TRUE, showWarnings=FALSE)
.libPaths(c(source.lib, .Library), include.site=FALSE)
if (!requireNamespace("renv", quietly=TRUE)) {
  # Only CRAN; bootstrap package is later restored to the pinned version.
  dir.create(source.lib, recursive=TRUE, showWarnings=FALSE)
  install.packages("renv", lib=source.lib)
}
.libPaths(c(source.lib, .Library), include.site=FALSE)
if (!requireNamespace("renv", quietly=TRUE)) stop("renv bootstrap is unavailable in the explicit library.")
if (action=="snapshot") {
  # Maintainer-only explicit update. The regular restore/run entry never snapshots.
  dir.create(dirname(lock), recursive=TRUE, showWarnings=FALSE)
  renv::snapshot(project=project, library=c(source.lib,.Library), lockfile=lock,
                 packages=c("renv","targets","survey","jsonlite","foreign","digest"), prompt=FALSE)
} else if (action=="restore") {
  if (!file.exists(lock)) stop("Missing versioned lockfile; do not silently create it during restore.")
  renv::restore(project=project, library=library.path, lockfile=lock, prompt=FALSE, clean=FALSE)
  .libPaths(c(library.path,.Library), include.site=FALSE)
  recorded <- jsonlite::read_json(lock, simplifyVector=FALSE)
  checks <- lapply(names(recorded$Packages), function(name) {
    found <- if (requireNamespace(name,quietly=TRUE)) utils::packageDescription(name)$Version else NA_character_
    expected <- recorded$Packages[[name]]$Version
    list(package=name, expected=expected, actual=found, matched=identical(found,expected))
  })
  if (!all(vapply(checks, function(x) x$matched, logical(1)))) stop("Restored versions differ from lockfile.")
  record <- list(status="RESTORED_PACKAGE_VERSIONS_MATCH", computedAt=format(Sys.time(),tz="UTC",usetz=TRUE),
                 R=R.version.string, lockedR=recorded$R$Version, RVersionMatches=identical(as.character(getRversion()),recorded$R$Version),
                 system=as.list(Sys.info()), library=library.path, libraryPaths=.libPaths(), packages=checks,
                 limitation="Same host, isolated package library; not a new OS or a container. R/system libraries must be supplied separately.")
  jsonlite::write_json(record, file.path(dirname(library.path),"环境恢复记录v2.2.json"), pretty=TRUE,auto_unbox=TRUE)
  print(record$status)
} else stop("Use restore [library-path] or explicit maintainer snapshot.")
