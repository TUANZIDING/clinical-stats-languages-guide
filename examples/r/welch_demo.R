# Run from the repository root: Rscript examples/r/welch_demo.R
# Synthetic independent observations only. Comparison direction is A-B.
args <- commandArgs(trailingOnly = TRUE)
path <- if (length(args)) args[1] else "data/synthetic-independent.csv"
d <- read.csv(path, stringsAsFactors = FALSE)
stopifnot(!anyDuplicated(d$id), setequal(unique(d$group), c("A", "B")))
stopifnot(!anyNA(d), is.numeric(d$value), all(is.finite(d$value)))
a <- d$value[d$group == "A"]
b <- d$value[d$group == "B"]
stopifnot(length(a) >= 2L, length(b) >= 2L)
# Explicit parameters make the planned method clear; no automatic NA deletion.
fit <- t.test(a, b, var.equal = FALSE, paired = FALSE,
              alternative = "two.sided", conf.level = 0.95)
out <- c(n_a = length(a), n_b = length(b), mean_a = mean(a), mean_b = mean(b),
         difference = mean(a) - mean(b), statistic = unname(fit$statistic),
         df = unname(fit$parameter), p_value = fit$p.value,
         ci_low = fit$conf.int[1], ci_high = fit$conf.int[2])
stopifnot(all(is.finite(out)))
for (key in names(out)) cat(key, "=", sprintf("%.12g", out[[key]]), "\n", sep = "")
