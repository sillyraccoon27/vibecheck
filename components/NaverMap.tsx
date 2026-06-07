"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// NCP Maps JavaScript API v3 — https://oapi.map.naver.com (구 openapi.map.naver.com)
const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

export const hasNaverMapKey = CLIENT_ID.length > 0;

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  selected: boolean;
};

declare global {
  interface Window {
    naver?: any;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadNaverMaps(): Promise<void> {
  if (typeof window !== "undefined" && window.naver?.maps) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(CLIENT_ID)}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Naver Maps 스크립트 로드 실패"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function NaverMap({
  center,
  markers,
  onSelect,
  fallback,
}: {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  onSelect: (id: string) => void;
  fallback: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const storeMarkersRef = useRef<any[]>([]);
  const posKeyRef = useRef<string>("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    hasNaverMapKey ? "loading" : "error"
  );

  // 지도 초기화 (1회) — 이후 center/markers 변경은 아래 effect에서 처리
  useEffect(() => {
    if (!hasNaverMapKey) return;
    let cancelled = false;
    loadNaverMaps()
      .then(() => {
        if (cancelled) return;
        if (!mapRef.current && containerRef.current) {
          const { maps } = window.naver;
          mapRef.current = new maps.Map(containerRef.current, {
            center: new maps.LatLng(center.lat, center.lng),
            zoom: 15,
            scaleControl: false,
            mapDataControl: false,
          });
        }
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기준 지역 변경 시 지도 중심 이동 + 기준점 마커 갱신
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const { maps } = window.naver;
    const pos = new maps.LatLng(center.lat, center.lng);
    mapRef.current.setCenter(pos);
    if (centerMarkerRef.current) centerMarkerRef.current.setMap(null);
    centerMarkerRef.current = new maps.Marker({
      position: pos,
      map: mapRef.current,
      icon: {
        content:
          '<div style="width:16px;height:16px;border-radius:9999px;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,0.35);"></div>',
        anchor: new maps.Point(8, 8),
      },
      zIndex: 50,
    });
  }, [status, center.lat, center.lng]);

  // 매장 마커 갱신
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const { maps } = window.naver;
    storeMarkersRef.current.forEach((m) => m.setMap(null));
    storeMarkersRef.current = markers.map((m) => {
      const style = m.selected
        ? "background:#0f172a;color:#fff;border:2px solid #0f172a;"
        : "background:#fff;color:#0f172a;border:2px solid #fff;";
      const marker = new maps.Marker({
        position: new maps.LatLng(m.lat, m.lng),
        map: mapRef.current,
        icon: {
          content: `<div style="${style}min-width:22px;height:22px;padding:0 4px;display:flex;align-items:center;justify-content:center;border-radius:9999px;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(15,23,42,0.25);cursor:pointer;">${m.label}</div>`,
          anchor: new maps.Point(11, 11),
        },
        zIndex: m.selected ? 100 : 60,
      });
      maps.Event.addListener(marker, "click", () => onSelectRef.current(m.id));
      return marker;
    });

    // 마커 "위치"가 바뀐 경우에만 전체 마커가 보이도록 뷰를 맞춘다.
    // (선택 변경으로 마커가 다시 그려질 때는 줌을 유지)
    const posKey = markers.map((m) => `${m.lat.toFixed(6)},${m.lng.toFixed(6)}`).join("|");
    if (markers.length > 0 && posKey !== posKeyRef.current) {
      posKeyRef.current = posKey;
      const bounds = new maps.LatLngBounds();
      bounds.extend(new maps.LatLng(center.lat, center.lng));
      markers.forEach((m) => bounds.extend(new maps.LatLng(m.lat, m.lng)));
      mapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [status, markers, center.lat, center.lng]);

  if (status === "error") return <>{fallback}</>;

  return (
    <div className="relative h-[360px]">
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas text-xs text-ink-subtle">
          네이버 지도 불러오는 중...
        </div>
      )}
    </div>
  );
}
