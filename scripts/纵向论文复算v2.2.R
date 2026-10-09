# Original wrapper, not copied author code. GPL author functions are read only from
# their local downloaded distribution; attribution/license remain with materials.
# Frozen targets are checked before reading numerical data or fitting any model.
args <- commandArgs(trailingOnly=TRUE)
root <- normalizePath(".")
lib <- if(length(args)) normalizePath(args[[1]]) else file.path(root,"build","纵向R验收v2.2")
out <- if(length(args)>1) normalizePath(args[[2]],mustWork=FALSE) else file.path(root,"build","纵向论文重跑v2.2")
.libPaths(c(lib,.Library),include.site=FALSE)
dir.create(out,recursive=TRUE,showWarnings=FALSE)
library(lme4)
sha <- function(path) digest::digest(file=path,algo="sha256")
target.path <- file.path(root,"data","纵向论文目标v2.2.json")
frozen.sha <- "8864d5d321271b669027d170cae15a2c2d8c14552a7ab4086eae931dc57a5563"
stopifnot(identical(sha(target.path),frozen.sha))
sources <- jsonlite::read_json(file.path(root,"data","纵向论文来源v2.2.json"))
stopifnot(identical(sources$frozenTargets$sha256,frozen.sha))
lock <- jsonlite::read_json(file.path(root,"config","纵向R环境锁v2.2.json"))
versions <- lapply(names(lock$Packages),function(p) {
  actual <- utils::packageDescription(p)$Version
  if(!identical(actual,lock$Packages[[p]]$Version)) stop("Package drift: ",p)
  list(package=p,version=actual)
})
if(!identical(as.character(getRversion()),lock$R$Version)) stop("R version drift; review explicitly before running")
materials <- file.path(root,"build","纵向论文材料v2.2")
for(item in sources$files) {
  p <- file.path(materials,item$file)
  if(!file.exists(p) || !identical(sha(p),item$sha256)) stop("Source drift: ",item$file)
}
started <- format(Sys.time(),tz="UTC",usetz=TRUE)
d <- read.delim(file.path(materials,"作者公共数据v2.2.tsv"),stringsAsFactors=FALSE,check.names=FALSE)
symptoms <- names(d)[9:24]
stopifnot(identical(symptoms[11],"Nausea"),!anyDuplicated(d[c("PersonID","Measurement")]),
          all(sort(unique(d$Measurement))==c(0,14,180,365)),
          all(vapply(d[symptoms],function(x) all(is.na(x)|(x>=0 & x<=10)),logical(1))))
visits <- as.data.frame(table(d$Measurement)); names(visits) <- c("occasion","rows")
patients <- unique(d$PersonID)
baseline <- d[d$Measurement==0,,drop=FALSE]
stopifnot(!anyDuplicated(baseline$PersonID))
dates <- as.Date(d$Date,format="%d.%m.%Y")
baseline.dates <- as.Date(baseline$Date,format="%d.%m.%Y")
elapsed <- as.numeric(dates-baseline.dates[match(d$PersonID,baseline$PersonID)])
stopifnot(!anyNA(dates),!anyNA(elapsed))
# Preserve an inconsistent source date; selected author models use the categorical
# Measurement label, not elapsed days. Do not repair or exclude the record to pass.
date.anomalies <- data.frame(PersonID=d$PersonID[elapsed<0],Measurement=d$Measurement[elapsed<0],
                             Date=d$Date[elapsed<0],elapsedDays=elapsed[elapsed<0])
timing <- lapply(split(elapsed,d$Measurement),function(x) list(min=min(x),median=median(x),max=max(x)))
frequency <- table(table(d$PersonID))
fatigue <- binom.test(sum(baseline$Fatigue>0,na.rm=TRUE),sum(!is.na(baseline$Fatigue)))
observed <- list(rows=nrow(d),patients=length(patients),occasions=nrow(visits),
                 patients4=unname(frequency["4"]),patients3=unname(frequency["3"]),patients2=unname(frequency["2"]),
                 males=sum(baseline$Sex=="Male"),itemMissingRows=sum(rowSums(is.na(d[symptoms]))>0),
                 fatigueCount=unname(fatigue$statistic),fatigueDenominator=unname(fatigue$parameter),
                 fatiguePercent=100*unname(fatigue$estimate),
                 fatigueLowerPercent=100*fatigue$conf.int[1],fatigueUpperPercent=100*fatigue$conf.int[2])
capture <- function(expr) {
  warnings <- character(); messages <- character(); error <- NULL
  value <- tryCatch(withCallingHandlers(expr,warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")},
                                       message=function(m){messages<<-c(messages,conditionMessage(m));invokeRestart("muffleMessage")}),
                    error=function(e){error<<-conditionMessage(e);NULL})
  list(value=value,error=error,warnings=unique(warnings),messages=unique(messages))
}
author <- new.env(parent=globalenv())
sys.source(file.path(materials,"作者变量类型v2.2.R"),envir=author)
sys.source(file.path(materials,"作者混合模型v2.2.R"),envir=author)
run.author <- function(env,binary) env$mixedModel(d,"Nausea","Measurement","PersonID","Measurement","Date",0,binary,"MMsimple")
original.binary <- capture(run.author(author,TRUE))
original.continuous <- capture(run.author(author,FALSE))
adapter <- NULL
continuous <- original.continuous
if(!is.null(original.continuous$error) && grepl("not an exported object",original.continuous$error,fixed=TRUE)) {
  original.text <- readLines(file.path(materials,"作者混合模型v2.2.R"),warn=FALSE)
  occurrences <- sum(lengths(regmatches(original.text,gregexpr("lmerTest::summary(model)",original.text,fixed=TRUE))))
  stopifnot(occurrences==1)
  adapted.text <- gsub("lmerTest::summary(model)","summary(model)",original.text,fixed=TRUE)
  adapter.path <- file.path(out,"作者兼容适配v2.2.R")
  writeLines(adapted.text,adapter.path,useBytes=TRUE)
  adapted <- new.env(parent=globalenv())
  sys.source(file.path(materials,"作者变量类型v2.2.R"),envir=adapted)
  sys.source(adapter.path,envir=adapted)
  continuous <- capture(run.author(adapted,FALSE))
  adapter <- list(kind="single namespace dispatch compatibility change; GPL-3 derived file kept in ignored build",
                  from="lmerTest::summary(model)",to="summary(model)",occurrences=occurrences,
                  originalError=original.continuous$error,sha256=sha(adapter.path),
                  limitations="Not unmodified author-code execution; no formula, optimizer, CI or expected-value changes")
}
extract14 <- function(run,binary) {
  if(is.null(run$value)) return(NULL)
  row <- run$value$coVariate1st[as.character(run$value$coVariate1st$CovariateLevel)=="14",,drop=FALSE]
  stopifnot(nrow(row)==1)
  prefix <- if(binary) "OR" else "beta"
  list(estimate=unname(row[[prefix]][1]),lower=unname(row[[paste0(prefix,"CILower")]][1]),
       upper=unname(row[[paste0(prefix,"CIUpper")]][1]),p=unname(row[[paste0(prefix,"PValue")]][1]))
}
binary14 <- extract14(original.binary,TRUE)
linear14 <- extract14(continuous,FALSE)
for(pair in list(list(prefix="linear",value=linear14),list(prefix="logistic",value=binary14))) {
  if(!is.null(pair$value)) {
    for(place in c("Text","SI")) {
      for(k in c("Estimate","Lower","Upper")) observed[[paste0(pair$prefix,k,place)]] <- pair$value[[tolower(k)]]
    }
    observed[[paste0(pair$prefix,"PSI")]] <- pair$value$p
  }
}
# Independent diagnostic fits with the same fixed formula, separate from the author
# output. No post-hoc tuning is performed to match a published number.
df <- d; df$Measurement <- factor(df$Measurement,levels=c(0,14,180,365)); df$binaryNausea <- ifelse(df$Nausea>0,1,0)
diag.lmm <- capture(lmerTest::lmer(Nausea~Measurement+(1|PersonID),data=df,na.action=na.omit))
diag.glmm <- capture(lme4::glmer(binaryNausea~Measurement+(1|PersonID),data=df,family=binomial,na.action=na.omit))
diagnose <- function(run) {
  if(is.null(run$value)) return(list(status="FAILED",error=run$error,warnings=run$warnings))
  m <- run$value
  list(status="EXECUTED_NOT_METHOD_APPROVAL",nobs=nobs(m),patients=length(unique(model.frame(m)$PersonID)),
       formula=paste(deparse(formula(m)),collapse=""),REML=if(inherits(m,"lmerMod"))lme4::isREML(m) else NULL,
       nAGQ=if(inherits(m,"glmerMod"))m@devcomp$dims[["nAGQ"]] else NULL,
       optimizer=m@optinfo$optimizer,convergenceCode=m@optinfo$conv$opt,
       convergenceMessages=m@optinfo$conv$lme4$messages,singular=lme4::isSingular(m),
       gradientMax=max(abs(m@optinfo$derivs$gradient)),randomVariance=as.data.frame(VarCorr(m)),
       fixedEffects=as.list(lme4::fixef(m)),warnings=run$warnings,
       remaining=c("Residual/Q-Q interpretation, random-effect distribution and influence not independently reviewed",
                   "Missing-at-random plausibility and alternative covariance/estimand sensitivity not evaluated"))
}
targets <- jsonlite::read_json(target.path)
comparison <- lapply(targets$targets,function(t) {
  actual <- observed[[t$id]]
  difference <- if(is.null(actual)) NULL else as.numeric(actual-t$value)
  status <- if(is.null(actual)) "UNREPRODUCED" else if(abs(difference)<=t$tolerance+1e-12) "MATCH" else "DIFFERENCE"
  list(id=t$id,published=t$value,actual=actual,difference=difference,tolerance=t$tolerance,
       rounding=t$rounding,location=t$location,status=status)
})
run.public <- function(x) list(error=x$error,warnings=x$warnings,messages=x$messages,
                               returned=if(is.null(x$value))NULL else x$value$coVariate1st)
record <- list(schemaVersion="2.2",case="medplot-longitudinal",execution=list(kind="recomputed",startedAt=started,
               completedAt=format(Sys.time(),tz="UTC",usetz=TRUE),scope="Nausea mixed models and data summary; not full paper"),
               frozenTargets=list(sha256=frozen.sha,frozenAt=targets$frozenAt),authorCommit=sources$authorCommit,
               authorRuns=list(binaryUnmodified=run.public(original.binary),continuousUnmodified=run.public(original.continuous),
                               continuousCompatible=run.public(continuous),adapter=adapter),
               population=list(description="Released EM demo: adults with erythema migrans; original source-cohort exclusions not documented here",
                               unit="participant; rows are visits",sampling="clinical cohort, not survey",causalClaim=FALSE),
               denominators=list(patients=length(patients),observedVisits=nrow(d),plannedGrid=length(patients)*4,
                                 absentVisits=length(patients)*4-nrow(d),perVisit=visits,
                                 perOutcomeMissing=lapply(d[symptoms],function(x)sum(is.na(x))),
                                 nauseaObserved=sum(!is.na(d$Nausea)),nauseaPatients=length(unique(d$PersonID[!is.na(d$Nausea)]))),
               missing=list(method="Per-outcome na.omit; no imputation",missingVisitReason="UNKNOWN",
                            sourceCohortExclusions="UNKNOWN",itemMissingRows=observed$itemMissingRows,
                            assumption="Likelihood-based inference requires justified missingness assumptions; not established by few item NAs"),
               estimands=list(continuous="Model-based mean nausea VAS difference at day14 minus baseline (0–10 scale); not median or causal treatment effect",
                              binary="Subject-specific conditional odds ratio of Nausea>0 at day14 versus baseline; not marginal OR, RR or HR"),
               statistics=list(linear14=linear14,logistic14=binary14,fatigue=list(count=observed$fatigueCount,n=observed$fatigueDenominator,
                 estimate=unname(fatigue$estimate),lower=fatigue$conf.int[1],upper=fatigue$conf.int[2],algorithm="Clopper-Pearson exact binomial")),
               intervals=list(linear="lme4 profile likelihood, 95%, default confint",binary="exp(log-odds coefficient ± normal 1.9599639845 × SE), 95% Wald"),
               diagnostics=list(linear=diagnose(diag.lmm),binary=diagnose(diag.glmm),IDAndRangeChecks="executed",
                                binaryFrequency=as.data.frame(table(Measurement=df$Measurement,NauseaPresence=df$binaryNausea,useNA="ifany")),
                                time=list(origin="baseline Date per PersonID",modelTime="categorical scheduled Measurement, not elapsed days",actualElapsedDays=timing,
                                          negativeElapsedRows=date.anomalies,status=if(nrow(date.anomalies))"SOURCE_DATE_INCONSISTENCY" else "NO_NEGATIVE_ELAPSED_TIME"),
                                independentUnitVerified="participant ID; not 812 independent patients"),
               observations=observed,comparison=comparison,
               summary=list(matched=sum(vapply(comparison,function(x)x$status=="MATCH",logical(1))),
                            differences=sum(vapply(comparison,function(x)x$status=="DIFFERENCE",logical(1))),
                            unreproduced=sum(vapply(comparison,function(x)x$status=="UNREPRODUCED",logical(1))),total=length(comparison)),
               warnings=c(targets$sourceConflicts,paste(nrow(date.anomalies),"released rows have a Date before that patient's baseline; source retained, not repaired. Original categorical-time models do not use this date."),"Author running environment/commit not exactly specified by article",
                          "Original continuous author function may fail on a removed namespace export; compatible result is separately labeled",
                          "No full paper reproduction, independent methodology approval, AI evaluation or human usability evaluation"),
               unreproduced=targets$unreproduced,
               environment=list(R=R.version.string,system=as.list(Sys.info()),libraryPaths=.libPaths(),packages=versions,
                                BLAS=extSoftVersion()[["BLAS"]],session=capture.output(sessionInfo()),
                                isolation="fresh locked library on same host; not 2015 runtime"),
               code=list(path="scripts/纵向论文复算v2.2.R",sha256=sha(file.path(root,"scripts","纵向论文复算v2.2.R"))),
               lock=list(path="config/纵向R环境锁v2.2.json",sha256=sha(file.path(root,"config","纵向R环境锁v2.2.json"))))
jsonlite::write_json(record,file.path(out,"纵向计算结果v2.2.json"),pretty=TRUE,auto_unbox=TRUE,digits=16,null="null",na="null")
print(record$summary)
if(is.null(binary14) || is.null(linear14)) stop("A selected model was not recomputed; keep failure record")
