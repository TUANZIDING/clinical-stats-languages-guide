# Explicit full replay; requires restored R library and Python requirements.
args <- commandArgs(trailingOnly=TRUE)
root <- normalizePath(".")
lib <- if (length(args)) normalizePath(args[[1]]) else file.path(root,"build","R恢复环境v2.2")
out <- if (length(args)>1) normalizePath(args[[2]],mustWork=FALSE) else file.path(root,"build","完整重跑v2.2")
store <- if (length(args)>2) args[[3]] else file.path(root,"build","目标状态v2.2")
.libPaths(c(lib,.Library),include.site=FALSE)
Sys.setenv(R_LIBS=lib,R_LIBS_USER=file.path(root,"build","R禁用用户库v2.2"),
           R_LIBS_SITE=file.path(root,"build","R禁用站点库v2.2"),CLINICAL_REPLAY_OUT=out,PYTHONDONTWRITEBYTECODE="1")
if (!requireNamespace("targets",quietly=TRUE)) stop("Restore the versioned R environment first.")
lock <- jsonlite::read_json(file.path(root,"config","R环境锁v2.2.json"))
for (name in names(lock$Packages)) {
  if (!requireNamespace(name,quietly=TRUE) || utils::packageDescription(name)$Version!=lock$Packages[[name]]$Version)
    stop("Package version differs from lockfile: ",name)
}
if (as.character(getRversion())!=lock$R$Version) warning("R differs from lockfile; record drift, do not claim identical environment")
targets::tar_make(script="scripts/分析流水线v2.2.R",store=store,reporter="verbose")
cat("Actual recomputation completed for two teaching fixtures and selected NHANES models. Not whole-paper replication.\n")
