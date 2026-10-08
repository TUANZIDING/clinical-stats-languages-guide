/* Teaching only. Same synthetic CSV, groups A/B, direction A-B.
   Edit the path to your local SAS server path before running.
   OnDemand runs on a remote server: upload ONLY this synthetic CSV. */
%let demo_csv=/your/path/synthetic-independent.csv;

data demo;
  infile "&demo_csv" dsd firstobs=2 truncover;
  length id $3 group $1;
  input id $ group $ value;
run;

/* Stop on invalid group, missing/non-finite numeric input, or duplicate IDs.
   SAS numeric missing values are caught by missing(value). */
proc sql noprint;
  select count(*) into :bad trimmed from demo
    where missing(id) or missing(group) or group not in ('A','B') or missing(value);
  select count(*) - count(distinct id) into :duplicates trimmed from demo;
  select sum(group='A'), sum(group='B') into :n_a trimmed, :n_b trimmed from demo;
quit;
%macro validate_demo;
  %if &bad > 0 or &duplicates > 0 or &n_a < 2 or &n_b < 2 %then %do;
    %put ERROR: Invalid teaching input. No silent deletion is permitted.;
    %abort cancel;
  %end;
%mend;
%validate_demo;

/* CLASS order=internal puts A before B. Read the Satterthwaite row,
   not the Pooled row. Its estimate/CI direction is A-B.
   alpha=0.05 -> 95% CI; sides=2 -> two-sided. */
proc ttest data=demo order=internal alpha=0.05 sides=2;
  class group;
  var value;
run;
