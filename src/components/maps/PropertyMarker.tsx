import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface PropertyMarkerProps {
  map: maplibregl.Map;
  property: {
    id: string;
    title: string;
    price: number | null;
    lat: number;
    lng: number;
    status?: string;
  };
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  available: '#1a4731',
  sold: '#dc2626',
  rented: '#2563eb',
  under_offer: '#f59e0b',
  off_market: '#6b7280',
};

export function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
  if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`;
  return `₹${price}`;
}

export function createMarkerElement(
  property: { title: string; price: number | null; status?: string },
  isSelected: boolean = false,
  isHovered: boolean = false
): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'map-marker-container';
  el.style.cssText = `
    position: relative; display: inline-flex; flex-direction: column;
    align-items: center; cursor: pointer; z-index: ${isSelected ? 10 : isHovered ? 5 : 1};
    transition: z-index 0s;
  `;

  const pinColor = STATUS_COLORS[property.status || 'available'] || '#1a4731';
  const priceText = property.price ? formatPrice(property.price) : '—';
  const nameText = property.title.length > 14 ? property.title.slice(0, 14) + '…' : property.title;

  const label = document.createElement('div');
  label.style.cssText = `
    background: ${isSelected ? '#1a4731' : '#ffffff'};
    border-radius: 8px; padding: 4px 10px;
    box-shadow: ${isSelected || isHovered ? '0 4px 16px rgba(26,71,49,0.25)' : '0 2px 10px rgba(0,0,0,0.15)'};
    border: 1.5px solid ${isSelected || isHovered ? '#1a4731' : '#e2e8ed'};
    display: flex; flex-direction: column; align-items: center;
    white-space: nowrap; transition: all 0.15s ease;
    transform: ${isHovered ? 'scale(1.05)' : 'scale(1)'};
    font-family: 'Urbanist', sans-serif;
  `;

  const priceSpan = document.createElement('span');
  priceSpan.style.cssText = `
    font-size: 11px; font-weight: 800;
    color: ${isSelected ? '#ffffff' : '#1a4731'};
  `;
  priceSpan.textContent = priceText;

  const nameSpan = document.createElement('span');
  nameSpan.style.cssText = `
    font-size: 9px; font-weight: 500;
    color: ${isSelected ? 'rgba(255,255,255,0.75)' : '#94a3b8'};
    max-width: 90px; overflow: hidden; text-overflow: ellipsis;
  `;
  nameSpan.textContent = nameText;

  label.appendChild(priceSpan);
  label.appendChild(nameSpan);

  const pin = document.createElement('div');
  pin.style.cssText = `
    width: 10px; height: 10px;
    background: ${isSelected ? '#40916c' : pinColor};
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg); margin-top: -3px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  `;

  el.appendChild(label);
  el.appendChild(pin);
  return el;
}

export function createClusterElement(count: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 36px; height: 36px; border-radius: 50%;
    background: #1a4731; color: white;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Urbanist', sans-serif; font-size: 13px; font-weight: 800;
    border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    cursor: pointer;
  `;
  el.textContent = String(count);
  return el;
}
