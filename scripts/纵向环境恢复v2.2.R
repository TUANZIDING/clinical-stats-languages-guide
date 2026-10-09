# Official renv APIs with a versioned custom lock and isolated writable paths.
args <- commandArgs(trailingOnly=TRUE)
action <- if(length(args)) args[[1]] else "restore"
root <- normalizePath(".")
lock <- file.path(root,"config","纵向R环境锁v2.2.json")
source.lib <- if(length(args)>2) normalizePath(args[[3]],mustWork=FALSE) else file.path(root,"build","纵向R包源v2.2")
base.lib <- file.path(root,"build","R验收环境v2.2")
destination <- if(length(args)>1) normalizePath(args[[2]],mustWork=FALSE) else file.path(root,"build","纵向R验收v2.2")
project <- file.path(root,"build","纵向恢复项目v2.2")
dir.create(project,recursive=TRUE,showWarnings=FALSE)
Sys.setenv(RENV_PATHS_ROOT=file.path(project,"cache"),RENV_PATHS_RENV=file.path(project,"state"),
           RENV_CONFIG_AUTO_SNAPSHOT="FALSE",RENV_CONFIG_USER_PROFILE="FALSE")
options(repos=c(CRAN="https://cloud.r-project.org"))
dir.create(source.lib,recursive=TRUE,showWarnings=FALSE)
bootstrap.paths <- if(action=="snapshot") c(source.lib,base.lib,.Library) else c(source.lib,.Library)
.libPaths(bootstrap.paths,include.site=FALSE)
if(!requireNamespace("renv",quietly=TRUE)) {
  dir.create(source.lib,recursive=TRUE,showWarnings=FALSE)
  install.packages("renv",lib=source.lib)
}
.libPaths(bootstrap.paths,include.site=FALSE)
if(!requireNamespace("renv",quietly=TRUE)) stop("renv bootstrap is unavailable in the explicit library.")
if(action=="snapshot") {
  # Explicit maintainer action only; restore/replay never changes lock or targets.
  renv::snapshot(project=project,lockfile=lock,library=c(source.lib,base.lib,.Library),
                 packages=c("renv","lme4","lmerTest","jsonlite","digest"),prompt=FALSE)
} else if(action=="restore") {
  if(!file.exists(lock)) stop("Missing fixed lockfile")
  dir.create(destination,recursive=TRUE,showWarnings=FALSE)
  renv::restore(project=project,lockfile=lock,library=destination,prompt=FALSE,clean=FALSE)
  .libPaths(c(destination,.Library),include.site=FALSE)
  expected <- jsonlite::read_json(lock)
  checks <- lapply(names(expected$Packages),function(p) {
    actual <- utils::packageDescription(p)$Version
    list(package=p,expected=expected$Packages[[p]]$Version,actual=actual,
         matched=identical(actual,expected$Packages[[p]]$Version))
  })
  stopifnot(all(vapply(checks,function(x)x$matched,logical(1))))
  record <- list(status="RESTORED_PACKAGE_VERSIONS_MATCH",computedAt=format(Sys.time(),tz="UTC",usetz=TRUE),
                 R=R.version.string,lockedR=expected$R$Version,
                 RVersionMatches=identical(as.character(getRversion()),expected$R$Version),
                 system=as.list(Sys.info()),libraryPaths=.libPaths(),packages=checks,
                 limitation="Same macOS/arm64 host and system R; isolated fresh package library, not historical 2015 environment or a new OS.")
  jsonlite::write_json(record,file.path(dirname(destination),"纵向环境恢复记录v2.2.json"),pretty=TRUE,auto_unbox=TRUE)
  cat(record$status,"\n")
} else stop("Use restore [library] or explicit snapshot")
