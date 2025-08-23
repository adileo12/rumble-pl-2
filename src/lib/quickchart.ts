// Build a QuickChart URL (no network fetch needed unless you want to cache the image)
export function quickChartUrl(title: string, labels: string[], data: number[]) {
  const cfg = {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: title }
      }
    }
  };
  const encoded = encodeURIComponent(JSON.stringify(cfg));
  return `https://quickchart.io/chart?c=${encoded}&format=png&backgroundColor=white&width=900&height=600`;
}
