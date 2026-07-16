export const METRIC_COLORS = ["#A3C585", "#7FB3D5", "#E8B86D", "#C79BD3"]

export function metricColor(index: number) {
  return METRIC_COLORS[index % METRIC_COLORS.length]
}
