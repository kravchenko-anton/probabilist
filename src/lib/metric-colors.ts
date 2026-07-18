/** Apple-like semantic metric accents — green / cyan / orange / purple. */
export const METRIC_COLORS = ["#30D158", "#64D2FF", "#FF9F0A", "#BF5AF2"]

export function metricColor(index: number) {
  return METRIC_COLORS[index % METRIC_COLORS.length]
}
