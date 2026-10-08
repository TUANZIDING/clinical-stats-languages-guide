# Base R independent implementation; stdout is machine-readable CSV.
# Run from repository root. No raw patient data is used.
options(digits = 17)
d <- read.csv("data/synthetic-clinicalv2.0.csv", check.names = FALSE,
              na.strings = "", stringsAsFactors = FALSE)
stopifnot(nrow(d) == 96, !anyNA(d$id), !anyDuplicated(d$id),
          all(d$group %in% c("A", "B")),
          all(is.na(d$sex) | d$sex %in% c("F", "M")))
baseline <- c("age", "sex", "baseline-sbp", "baseline-crp")
answer <- list()
put <- function(key, value) answer[[key]] <<- unname(value)
for (g in c("A", "B")) {
  part <- d[d$group == g, ]
  put(paste0("groupN.", g), nrow(part))
  for (field in baseline) {
    x <- part[[field]]
    put(paste("table1", field, g, "n", sep = "."), sum(!is.na(x)))
    put(paste("table1", field, g, "missing", sep = "."), sum(is.na(x)))
    x <- x[!is.na(x)]
    if (field == "sex") {
      for (level in c("F", "M")) {
        put(paste("table1", field, g, "levels", level, "n", sep = "."), sum(x == level))
        put(paste("table1", field, g, "levels", level, "percent", sep = "."), 100 * mean(x == level))
      }
    } else {
      stopifnot(all(is.finite(x)))
      for (statistic in c("mean", "sd", "median")) {
        put(paste("table1", field, g, statistic, sep = "."), get(statistic)(x))
      }
      put(paste("table1", field, g, "q1", sep = "."), quantile(x, .25, type = 7))
      put(paste("table1", field, g, "q3", sep = "."), quantile(x, .75, type = 7))
    }
  }
}
# Outcome-only observed records: do not silently drop rows for baseline NA.
a <- d[["day28-sbp"]][d$group == "A"]
b <- d[["day28-sbp"]][d$group == "B"]
put("primary.missingA", sum(is.na(a))); put("primary.missingB", sum(is.na(b)))
a <- a[!is.na(a)]; b <- b[!is.na(b)]
stopifnot(all(is.finite(a)), all(is.finite(b)))
t <- t.test(a, b, var.equal = FALSE, alternative = "two.sided", conf.level = .95)
values <- list(nA = length(a), nB = length(b), meanA = mean(a), meanB = mean(b),
               sdA = sd(a), sdB = sd(b), difference = mean(a) - mean(b),
               ciLow = t$conf.int[1], ciHigh = t$conf.int[2], t = t$statistic,
               df = t$parameter, p = t$p.value)
for (key in names(values)) put(paste0("primary.", key), values[[key]])
for (g in c("A", "B")) {
  x <- if (g == "A") a else b
  s <- shapiro.test(x)
  put(paste("diagnostics", g, "shapiroW", sep = "."), s$statistic)
  put(paste("diagnostics", g, "shapiroP", sep = "."), s$p.value)
}
# Median-centered Levene (Brown-Forsythe): ordinary one-way ANOVA of
# absolute deviations from each group's median; cross-check SciPy center=median.
z <- c(abs(a - median(a)), abs(b - median(b)))
group <- factor(rep(c("A", "B"), c(length(a), length(b))))
lev <- summary(aov(z ~ group))[[1]]
put("diagnostics.levene.F", lev[1, "F value"])
put("diagnostics.levene.p", lev[1, "Pr(>F)"])
write.csv(data.frame(key = names(answer), value = as.numeric(answer)), stdout(), row.names = FALSE)
