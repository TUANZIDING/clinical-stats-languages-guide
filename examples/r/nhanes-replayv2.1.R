# Independent, bounded reimplementation of Nickels et al. (2019), Tables 2/3.
# This script does not source or execute the author's R Markdown.
# Original article: https://doi.org/10.1371/journal.pone.0211196 (CC BY).
# Author code inspected at commit 8beb4014f3a879b72271fe81ee1182c97b2b1adc.
# Run from repository root after scripts/fetch-nhanesv2.1.py --download.
# Package requirement: foreign, survey, jsonlite. Participant files stay in build/.
suppressPackageStartupMessages(library(survey))
suppressPackageStartupMessages(library(foreign))
suppressPackageStartupMessages(library(jsonlite))
cache <- file.path("build", "papersv2.1")
if (!dir.exists(cache)) stop("Fetch the bounded CDC public-use files first.")
cycles <- c(1999, 2001, 2003, 2005, 2007)
demo.names <- c("SEQN", "RIAGENDR", "RIDAGEEX", "RIDRETH1", "SDMVSTRA", "SDMVPSU", "DMDEDUC2")
vision.names <- c("SEQN", "VIXORSM", "VIXORCM", "VIXKRDM", "VIQ180", "VIQ200")
parts <- lapply(cycles, function(year) {
  demo <- read.xport(file.path(cache, paste0(year, "-demov2.1.xpt")))
  vision <- read.xport(file.path(cache, paste0(year, "-vixv2.1.xpt")))
  stopifnot(!anyDuplicated(demo$SEQN), !anyDuplicated(vision$SEQN))
  demo$MEC10YR <- if (year <= 2001) demo$WTMEC4YR * 2/5 else demo$WTMEC2YR / 5
  out <- merge(demo[c(demo.names, "MEC10YR")], vision[vision.names], by="SEQN", all=TRUE)
  out$year <- year
  out
})
d <- do.call(rbind, parts)
stopifnot(!anyDuplicated(d$SEQN))
flow <- list(downloaded_demographics=nrow(d))
d$age <- d$RIDAGEEX / 12
d$RIAGENDR <- factor(d$RIAGENDR, levels=c(1,2))
d$RIDRETH1 <- factor(d$RIDRETH1, levels=1:5)
d$year <- factor(d$year)
d$DMDEDUC2[which(d$DMDEDUC2 %in% c(7,9))] <- NA
d$DMDEDUC2 <- factor(d$DMDEDUC2, levels=1:5)
for (name in c("VIXORSM", "VIXORCM", "VIXKRDM")) d[[name]][which(d[[name]] == 88)] <- NA
for (name in c("VIQ180", "VIQ200")) d[[name]][which(d[[name]] == 9)] <- NA
d$SER <- d$VIXORSM + d$VIXORCM / 2
d$myopia <- as.integer(d$SER <= -0.75)
eligible <- complete.cases(d[c("RIAGENDR", "age", "SER", "DMDEDUC2")])
flow$complete_core <- sum(eligible)
flow$refractive_surgery_yes <- sum(eligible & d$VIQ180 == 1, na.rm=TRUE)
flow$refractive_surgery_missing <- sum(eligible & is.na(d$VIQ180))
after.ref <- eligible & !is.na(d$VIQ180) & d$VIQ180 != 1
flow$cataract_surgery_yes <- sum(after.ref & d$VIQ200 == 1, na.rm=TRUE)
flow$cataract_surgery_missing <- sum(after.ref & is.na(d$VIQ200))
keep <- after.ref & !is.na(d$VIQ200) & d$VIQ200 != 1
analysis <- d[keep, ]
flow$analysis <- nrow(analysis)
stopifnot(all(analysis$MEC10YR > 0), all(complete.cases(analysis[c("SDMVPSU", "SDMVSTRA")])) )
# Follow the publication's code: construct the design AFTER its analytic exclusions.
# A separate full-design domain sensitivity is also reported; it is not substituted.
design <- svydesign(id=~SDMVPSU, strata=~SDMVSTRA, nest=TRUE, weights=~MEC10YR, data=analysis)
fit.models <- function(design) {
  list(linear_crude=svyglm(SER ~ DMDEDUC2, design=design),
       linear_adjusted=svyglm(SER ~ DMDEDUC2 + RIAGENDR + age + year, design=design),
       logistic_crude=svyglm(myopia ~ DMDEDUC2, design=design, family=quasibinomial()),
       logistic_adjusted=svyglm(myopia ~ DMDEDUC2 + RIAGENDR + age + year, design=design, family=quasibinomial()))
}
models <- fit.models(design)
extract <- function(model, name) {
  terms <- paste0("DMDEDUC2", 2:5)
  tab <- summary(model)$coefficients
  ci <- confint(model)[terms, , drop=FALSE]
  # Older survey versions used a normal Wald interval; keep both explicitly labelled.
  zci <- cbind(coef(model)[terms] - qnorm(.975)*sqrt(diag(vcov(model)))[terms],
               coef(model)[terms] + qnorm(.975)*sqrt(diag(vcov(model)))[terms])
  exponentiate <- grepl("logistic", name)
  transform <- if (exponentiate) exp else identity
  data.frame(model=name, term=terms, n=nobs(model),
             estimate=transform(coef(model)[terms]),
             lower=transform(ci[,1]), upper=transform(ci[,2]),
             normal_lower=transform(zci[,1]), normal_upper=transform(zci[,2]),
             p=tab[terms,4], row.names=NULL)
}
estimates <- do.call(rbind, Map(extract, models, names(models)))
descriptives <- do.call(rbind, lapply(levels(analysis$DMDEDUC2), function(level) {
  x <- analysis[analysis$DMDEDUC2 == level, ]
  data.frame(education=level, n=nrow(x), mean_spherical_equivalent=mean(x$SER),
             myopia_percent=100*mean(x$myopia))
}))
# Domain sensitivity follows CDC advice: retain the examined sample in the design,
# then identify the analytic domain. Different intervals do not imply a failed copy.
examined <- d[!is.na(d$MEC10YR) & d$MEC10YR > 0 & complete.cases(d[c("SDMVPSU","SDMVSTRA")]), ]
examined$in_domain <- keep[match(examined$SEQN, d$SEQN)]
full.design <- svydesign(id=~SDMVPSU, strata=~SDMVSTRA, nest=TRUE, weights=~MEC10YR, data=examined)
domain <- subset(full.design, in_domain)
domain.model <- svyglm(SER ~ DMDEDUC2 + RIAGENDR + age + year, design=domain)
result <- list(pmid="30695049", doi="10.1371/journal.pone.0211196",
               scope="Selected primary models and sample flow; not whole-paper replication",
               flow=flow, descriptives=descriptives, estimates=estimates,
               confidence_interval="Current survey default t interval; normal Wald also recorded for version audit",
               domain_sensitivity=extract(domain.model, "linear_adjusted_domain"),
               versions=list(R=R.version.string, survey=as.character(packageVersion("survey")),
                             foreign=as.character(packageVersion("foreign")), jsonlite=as.character(packageVersion("jsonlite"))))
write_json(result, file.path(cache,"nhanes-replayv2.1.json"), pretty=TRUE, auto_unbox=TRUE, digits=NA, na="null")
write.csv(estimates, file.path(cache,"nhanes-estimatesv2.1.csv"), row.names=FALSE)
print(flow)
print(descriptives)
print(estimates)
