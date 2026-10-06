declare module "plotly.js-geo-dist-min" {
  // Minimal surface we use; the package ships no types.
  const Plotly: {
    react: (el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown) => Promise<unknown>;
    restyle: (el: HTMLElement, update: Record<string, unknown>, traces?: number[]) => Promise<unknown>;
    setPlotConfig: (config: { topojsonURL?: string }) => void;
    purge: (el: HTMLElement) => void;
  };
  export default Plotly;
}
