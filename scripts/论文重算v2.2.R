# Reuse the original independent implementation in a private working directory.
# The author's unlicensed R Markdown is never executed. Frozen repo files stay intact.
.libPaths(c(Sys.getenv("R_LIBS"),.Library),include.site=FALSE)
args <- commandArgs(trailingOnly=TRUE)
root <- normalizePath(args[[1]])
output <- normalizePath(args[[2]], mustWork=FALSE)
dir.create(output,recursive=TRUE,showWarnings=FALSE)
work <- file.path(output,"论文工作区v2.2")
cache <- file.path(work,"build","papersv2.1")
dir.create(cache,recursive=TRUE,showWarnings=FALSE)
manifest <- jsonlite::read_json(file.path(root,"data","nhanes-source-manifestv2.1.json"))
for (entry in manifest$files) {
  input <- file.path(root,"build","papersv2.1",entry$file)
  if (!file.exists(input) || digest::digest(input,file=TRUE,algo="sha256",serialize=FALSE)!=entry$sha256)
    stop("Public input missing or SHA-256 differs: ",entry$file,". Use the explicit bounded fetch, never silently replace a hash.")
  # Copy fixed-name inputs; no link allows outputs to reach the original cache.
  if (!file.copy(input,file.path(cache,entry$file),overwrite=TRUE)) stop("Cannot stage public input")
}
warnings <- character()
old <- getwd()
setwd(work)
env <- new.env(parent=globalenv())
withCallingHandlers(sys.source(file.path(root,"examples","r","nhanes-replayv2.1.R"),envir=env),
                    warning=function(w) {warnings <<- c(warnings,conditionMessage(w))})
setwd(old)
if (!file.copy(file.path(cache,"nhanes-replayv2.1.json"),file.path(output,"论文重算v2.2.json"),overwrite=TRUE)) stop("Missing replay output")
models <- lapply(env$models, function(model) list(converged=isTRUE(model$converged),
                  observations=stats::nobs(model), designDF=survey::degf(env$design),
                  dfResidual=model$df.residual, formula=deparse(stats::formula(model)),
                  deviance=model$deviance, family=model$family$family, link=model$family$link))
diagnostics <- list(executed=list(inputSha256="15 public files verified", idsWeightsDesign="original implementation assertions executed", models=models),
                    libraryPaths=.libPaths(),
                    notExecuted=c("残差形状、非线性、影响点与模型稳定性的完整评价", "调整集 / 缺失机制与抽样可识别性的独立方法学审核"),
                    warnings=unique(warnings), status="ACTUALLY_EXECUTED_PARTIAL_DIAGNOSTICS")
jsonlite::write_json(diagnostics,file.path(output,"论文诊断v2.2.json"),pretty=TRUE,auto_unbox=TRUE,digits=NA)
