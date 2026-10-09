# Passed explicitly to targets::tar_make(script=..., store=...). No _targets.R.
.libPaths(c(Sys.getenv("R_LIBS"),.Library),include.site=FALSE)
library(targets)
root <- normalizePath(".")
output <- normalizePath(Sys.getenv("CLINICAL_REPLAY_OUT", "build/完整重跑v2.2"),mustWork=FALSE)
python <- Sys.getenv("CLINICAL_PYTHON", "python3")
dir.create(output,recursive=TRUE,showWarnings=FALSE)
run.command <- function(command, arguments, log) {
  status <- system2(command,vapply(arguments,shQuote,character(1)),stdout=log,stderr=log)
  if (!identical(status,0L)) stop("Command failed; retained log: ", log)
  log
}
runtime.record <- function() {
  packages <- names(jsonlite::read_json("config/R环境锁v2.2.json")$Packages)
  value <- list(computedAt=format(Sys.time(),"%Y-%m-%dT%H:%M:%OS6Z",tz="UTC"), R=R.version.string,
                packages=as.list(setNames(vapply(packages,function(x) utils::packageDescription(x)$Version,character(1)),packages)),
                system=as.list(Sys.info()[c("sysname","release","version","machine")]), external=as.list(extSoftVersion()),
                libraryPaths=vapply(.libPaths(),function(x) if (startsWith(x,paste0(root,"/"))) substring(x,nchar(root)+2) else x,character(1)),
                sourceSha256=as.list(setNames(vapply(source.paths,function(x) digest::digest(x,file=TRUE,algo="sha256",serialize=FALSE),character(1)),source.paths)),
                inputSha256=as.list(setNames(vapply(data.paths,function(x) digest::digest(x,file=TRUE,algo="sha256",serialize=FALSE),character(1)),data.paths)),
                isolation="library isolation on same host; base R / OS / BLAS not restored by renv")
  path <- file.path(output,"运行环境v2.2.json")
  jsonlite::write_json(value,path,pretty=TRUE,auto_unbox=TRUE)
  path
}
source.paths <- c("scripts/统一结果v2.2.py","scripts/论文重算v2.2.R","scripts/分析流水线v2.2.R","scripts/运行流水线v2.2.R",
                  "scripts/clinical-reportv2.0.py","scripts/verify-paperv2.1.py","examples/python/welch_demo.py",
                  "examples/r/welch_demo.R","examples/r/clinical-crosscheckv2.0.R","examples/r/nhanes-replayv2.1.R",
                  "scripts/恢复环境v2.2.R","config/R环境锁v2.2.json","config/Python环境锁v2.2.txt","requirements.txt")
data.paths <- c("data/synthetic-independent.csv","data/synthetic-clinicalv2.0.csv","data/expected-results.json",
                "data/clinical-resultsv2.0.json","data/nhanes-source-manifestv2.1.json","data/paper-targetsv2.1.json","data/paper-replayv2.1.json")
tar_option_set(packages=c("jsonlite","digest"), error="stop")
list(
  tar_target(sourceFiles, source.paths, format="file"),
  tar_target(dataFiles, data.paths, format="file"),
  tar_target(publicFiles, {
    dataFiles
    entries <- jsonlite::read_json("data/nhanes-source-manifestv2.1.json")$files
    paths <- vapply(entries,function(x) file.path("build","papersv2.1",x$file),character(1))
    if (!all(file.exists(paths))) stop("Missing public inputs: use python3 scripts/fetch-nhanesv2.1.py --download explicitly.")
    paths
  },format="file"),
  # Always changes: the explicit replay entry genuinely recomputes each time.
  tar_target(runtime, {sourceFiles; dataFiles; runtime.record()},format="file",cue=tar_cue(mode="always")),
  tar_target(teaching, {
    runtime; dataFiles
    path <- file.path(output,"教学重算v2.2.json")
    run.command(python,c("scripts/统一结果v2.2.py","teaching","--output",path),file.path(output,"教学计算日志v2.2.log"))
    path
  },format="file"),
  tar_target(paper, {
    runtime; publicFiles
    run.command(file.path(R.home("bin"),"Rscript"),c("--vanilla","scripts/论文重算v2.2.R",root,output),file.path(output,"论文计算日志v2.2.log"))
    c(file.path(output,"论文重算v2.2.json"),file.path(output,"论文诊断v2.2.json"))
  },format="file"),
  tar_target(resultObject, {
    path <- file.path(output,"分析结果v2.2.json")
    run.command(python,c("scripts/统一结果v2.2.py","combine","--teaching",teaching,"--paper",paper[[1]],
                        "--paper-diagnostics",paper[[2]],"--r-environment",runtime,"--output",path),file.path(output,"结果合并日志v2.2.log"))
    path
  },format="file"),
  tar_target(reportArtifacts, {
    run.command(python,c("scripts/统一结果v2.2.py","render","--bundle",resultObject,"--output",output),file.path(output,"报告生成日志v2.2.log"))
    # Every artifact is a file target, so deleting/drifting one invalidates the target.
    c(resultObject,file.path(output,c("统一结果视图v2.2.js","统一结果报告v2.2.md","基线表v2.2.csv","基线表v2.2.html",
                                      "教学效应图v2.2.png","临床模拟效应图v2.2.png","论文效应图v2.2.png","产物来源v2.2.json")))
  },format="file"),
  tar_target(offlineAudit, {
    reportArtifacts
    log <- file.path(output,"快照核对日志v2.2.log")
    run.command(python,c("scripts/统一结果v2.2.py","check","--bundle",resultObject),log)
  },format="file")
)
