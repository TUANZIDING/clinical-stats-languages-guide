// Synthetic independent observations only; requires Boost Math headers.
#include <boost/math/distributions/students_t.hpp>
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

double mean(const std::vector<double>& x) {
    double total = 0;
    for (double v : x) total += v;
    return total / x.size();
}
double variance(const std::vector<double>& x) {
    const double m = mean(x);
    double total = 0;
    for (double v : x) total += (v-m)*(v-m);
    return total / (x.size()-1);
}
int main(int argc, char** argv) {
  try {
    std::ifstream file(argc > 1 ? argv[1] : "data/synthetic-independent.csv");
    if (!file) throw std::runtime_error("Cannot open synthetic CSV");
    std::string line;
    std::getline(file,line);
    if (!line.empty() && line.back() == '\r') line.pop_back();
    if (line != "id,group,value") throw std::runtime_error("Unexpected CSV header");
    std::vector<double> a,b;
    std::set<std::string> ids;
    while (std::getline(file,line)) {
      if (!line.empty() && line.back() == '\r') line.pop_back();
      if (line.empty()) throw std::runtime_error("Empty CSV row");
      std::stringstream row(line);
      std::string id,group,value,extra;
      if (!std::getline(row,id,',') || !std::getline(row,group,',') || !std::getline(row,value,','))
        throw std::runtime_error("Incomplete CSV row");
      if (std::getline(row,extra,',')) throw std::runtime_error("Too many CSV fields");
      if (id.empty() || !ids.insert(id).second) throw std::runtime_error("Missing/duplicate ID");
      if (group != "A" && group != "B") throw std::runtime_error("Unexpected group");
      size_t used = 0;
      double v = std::stod(value,&used);
      if (used != value.size() || !std::isfinite(v)) throw std::runtime_error("Invalid numeric value");
      (group == "A" ? a : b).push_back(v);
    }
    if (a.size()<2 || b.size()<2) throw std::runtime_error("Insufficient observations");
    const double ma=mean(a),mb=mean(b),va=variance(a)/a.size(),vb=variance(b)/b.size();
    if (va+vb <= 0) throw std::runtime_error("No estimable sampling variance");
    const double se=std::sqrt(va+vb),difference=ma-mb;
    const double df=(va+vb)*(va+vb)/(va*va/(a.size()-1)+vb*vb/(b.size()-1));
    const double t=difference/se;
    const boost::math::students_t distribution(df);
    const double p=2*boost::math::cdf(boost::math::complement(distribution,std::abs(t)));
    const double margin=boost::math::quantile(distribution,0.975)*se;
    std::cout << std::setprecision(12)
      << "n_a=" << a.size() << "\nn_b=" << b.size()
      << "\nmean_a=" << ma << "\nmean_b=" << mb
      << "\ndifference=" << difference << "\nstatistic=" << t
      << "\ndf=" << df << "\np_value=" << p
      << "\nci_low=" << difference-margin << "\nci_high=" << difference+margin << '\n';
  } catch (const std::exception& e) {
    std::cerr << e.what() << '\n';
    return 1;
  }
}
