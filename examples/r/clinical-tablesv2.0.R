# Optional publication-table/annotated-plot integration. Core lesson uses base R.
# Output goes to ignored build/. Run from repository root.
# Rscript examples/r/clinical-tablesv2.0.R [--plot] [task-local R library]
args <- commandArgs(trailingOnly = TRUE)
want.plot <- "--plot" %in% args
args <- args[args != "--plot"]
if (length(args)) .libPaths(c(normalizePath(args[1], mustWork = TRUE), .libPaths()))
needed <- c("gtsummary", "gt", "jsonlite")
if (want.plot) needed <- c(needed, "ggstatsplot", "ggplot2", "statsExpressions", "effectsize")
missing <- needed[!vapply(needed, requireNamespace, logical(1), quietly = TRUE)]
if (length(missing)) stop("Optional packages missing: ", paste(missing, collapse = ", "),
                        ". See docs/临床统计实操v2.0.md; core analysis does not need them.")
d <- read.csv("data/synthetic-clinicalv2.0.csv", check.names = FALSE, na.strings = "")
stopifnot(nrow(d) == 96, !anyDuplicated(d$id), all(d$group %in% c("A", "B")))
d$group <- factor(d$group, levels = c("A", "B"))
d$sex <- factor(d$sex, levels = c("F", "M"))
dir.create("build", showWarnings = FALSE)
# tbl_summary's {p25}/{p75} use type=2, whereas this lesson specifies type=7.
# Use the documented custom univariate-function syntax, not patched cell values.
q1type7 <- function(x) unname(quantile(x, .25, type = 7, na.rm = TRUE))
q3type7 <- function(x) unname(quantile(x, .75, type = 7, na.rm = TRUE))
tab <- gtsummary::tbl_summary(
  d, by = group, include = c(age, sex, `baseline-sbp`, `baseline-crp`),
  type = list(sex ~ "categorical"),
  statistic = list(c(age, `baseline-sbp`) ~ "{mean} ({sd})",
                   `baseline-crp` ~ "{median} [{q1type7}, {q3type7}]", sex ~ "{n}/{N} ({p}%)"),
  digits = list(c(age, `baseline-sbp`) ~ 1, `baseline-crp` ~ 2,
                gtsummary::all_categorical() ~ c(0, 0, 1)),
  label = list(age ~ "Age (years)", sex ~ "Recorded sex (simulation labels)",
               `baseline-sbp` ~ "Baseline systolic BP (mmHg)", `baseline-crp` ~ "Baseline CRP (mg/L)"),
  missing = "always", missing_text = "Missing", missing_stat = "{N_miss}", percent = "column"
)
# Intentionally no add_p(): descriptive baseline table, not covariate screening.
tab <- gtsummary::modify_caption(tab, "**Table 1. Independent synthetic baseline records**")
tab <- gtsummary::modify_footnote_header(tab,
  footnote = "Mean (sample SD); median [Q1, Q3] (R quantile type=7); n/nonmissing (%). Missing shown separately.",
  columns = gtsummary::all_stat_cols())
reference <- jsonlite::fromJSON("data/clinical-resultsv2.0.json")
for (field in c("age", "baseline-sbp", "baseline-crp")) {
  cells <- tab$table_body[tab$table_body$variable == field & tab$table_body$row_type == "label", ]
  missing.cells <- tab$table_body[tab$table_body$variable == field & tab$table_body$row_type == "missing", ]
  for (i in seq_along(c("A", "B"))) {
    g <- c("A", "B")[i]; s <- reference$table1[[field]][[g]]
    expected <- if (field == "baseline-crp") sprintf("%.2f [%.2f, %.2f]", s$median, s$q1, s$q3) else sprintf("%.1f (%.1f)", s$mean, s$sd)
    actual <- cells[[paste0("stat_", i)]]
    if (!identical(actual, expected)) stop(field, " ", g, ": actual=", actual, "; expected=", expected)
    stopifnot(missing.cells[[paste0("stat_", i)]] == as.character(s$missing))
  }
}
for (level in c("F", "M")) {
  cells <- tab$table_body[tab$table_body$variable == "sex" & tab$table_body$row_type == "level" & tab$table_body$label == level, ]
  for (i in seq_along(c("A", "B"))) {
    s <- reference$table1$sex[[c("A", "B")[i]]]
    expected <- sprintf("%d/%d (%.1f%%)", s$levels[[level]]$n, s$n, s$levels[[level]]$percent)
    stopifnot(cells[[paste0("stat_", i)]] == expected)
  }
}
cat("gtsummary displayed summaries, missing counts and category denominators match core.\n")
gt::gtsave(gtsummary::as_gt(tab), "build/gtsummary-tablev2.0.html")
write.csv(gtsummary::as_tibble(tab), "build/gtsummary-tablev2.0.csv", row.names = FALSE)
if (!want.plot) {
  versions <- vapply(needed, function(x) as.character(packageVersion(x)), character(1))
  write.csv(data.frame(package = names(versions), version = versions), "build/r-versionsv2.0.csv", row.names = FALSE)
  cat("gtsummary Table 1 exported; add --plot to run ggstatsplot integration.\n")
  quit(status = 0)
}
known <- d[!is.na(d[["day28-sbp"]]), ]
a <- known[["day28-sbp"]][known$group == "A"]
b <- known[["day28-sbp"]][known$group == "B"]
t <- t.test(a, b, var.equal = FALSE, alternative = "two.sided", conf.level = .95)
ref <- jsonlite::fromJSON("data/clinical-resultsv2.0.json")$primary
stopifnot(isTRUE(all.equal(unname(t$statistic), ref$t, tolerance = 1e-9)),
          isTRUE(all.equal(unname(t$p.value), ref$p, tolerance = 1e-9)),
          isTRUE(all.equal(mean(a) - mean(b), ref$difference, tolerance = 1e-9)))
set.seed(20261008) # jitter only, not an inferential resampling procedure
plot <- ggstatsplot::ggbetweenstats(
  data = known, x = group, y = `day28-sbp`, type = "parametric",
  alternative = "two.sided", conf.level = .95, pairwise.display = "none",
  bf.message = FALSE, results.subtitle = TRUE, digits = "signif4",
  xlab = "Independent synthetic records", ylab = "Day 28 systolic BP (mmHg)",
  title = "SIMULATION ONLY: two independent groups",
  caption = paste0("Observed n: A=", length(a), ", B=", length(b),
                   "; missing outcome: A=3, B=5. No imputation/outlier deletion.\n",
                   "Dots=records; center=mean; box=Q1/median/Q3; whiskers=1.5 IQR.\n",
                   "ggstatsplot's standardized effect is a companion to the raw A-B difference, not the same measure.")
)
plot <- plot + ggplot2::labs(caption = paste0(
  "Dots = independent simulation records; observed n: A=45, B=43; missing outcome: A=3, B=5.\n",
  "Center = mean; box = Q1/median/Q3; whiskers end at data within 1.5 IQR; violin = estimated density.\n",
  "No imputation or outlier deletion. Standardized effect uses non-pooled SD; CI uses noncentral t.\n",
  "Raw A-B difference = 9.03 mmHg [2.53, 15.53]; not the standardized interval."))
ggplot2::ggsave("build/ggstatsplot-outcomev2.0.png", plot, width = 11, height = 8, dpi = 160)
# Verify the plot's own test result rather than inferring success from appearance.
details <- ggstatsplot::extract_stats(plot)
stopifnot(nrow(details$subtitle_data) == 1,
          isTRUE(all.equal(details$subtitle_data$statistic, ref$t, tolerance = 1e-9)),
          isTRUE(all.equal(details$subtitle_data$p.value, ref$p, tolerance = 1e-9)),
          details$subtitle_data$n.obs == length(a) + length(b))
g <- effectsize::hedges_g(a, b, pooled_sd = FALSE, ci = .95, alternative = "two.sided")
stopifnot(isTRUE(all.equal(details$subtitle_data$estimate, g$Hedges_g, tolerance = 1e-9)),
          isTRUE(all.equal(details$subtitle_data$conf.low, g$CI_low, tolerance = 1e-9)),
          isTRUE(all.equal(details$subtitle_data$conf.high, g$CI_high, tolerance = 1e-9)))
write.csv(as.data.frame(details$subtitle_data[setdiff(names(details$subtitle_data), "expression")]),
          "build/ggstatsplot-statisticsv2.0.csv", row.names = FALSE)
str(details, max.level = 2)
saveRDS(details, "build/ggstatsplot-statisticsv2.0.rds")
versions <- vapply(needed, function(x) as.character(packageVersion(x)), character(1))
write.csv(data.frame(package = names(versions), version = versions), "build/r-versionsv2.0.csv", row.names = FALSE)
cat("Optional Table 1 and ggstatsplot exports complete. Inspect extracted statistics before reuse.\n")
