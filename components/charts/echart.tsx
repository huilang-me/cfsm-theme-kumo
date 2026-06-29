"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

export function EChart({
  option,
  height = 200,
  className,
}: {
  option: EChartsOption;
  height?: number;
  className?: string;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    const chart = echarts.init(elementRef.current, undefined, {
      renderer: "canvas",
    });
    chartRef.current = chart;
    chart.setOption(option, true);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(elementRef.current);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={elementRef} style={{ height, width: "100%" }} className={className} />;
}
