import React from 'react';
import { FireCaseInput, FireCaseResult } from '../../models/calculationTypes';

interface VesselFireSvgProps {
  input: FireCaseInput;
  result: FireCaseResult;
}

/**
 * Pure inline SVG engineering schematic illustrating vessel outline,
 * liquid level, fire-exposure height limit, grade elevation, and wetted region.
 * 100% offline compatible.
 */
export const VesselFireSvg: React.FC<VesselFireSvgProps> = ({ input, result }) => {
  const isHoriz =
    input.geometryType === 'horizontal_cylinder_heads' ||
    input.geometryType === 'heat_exchanger_shell';
  const isSphere = input.geometryType === 'sphere';

  const D = Math.max(0.5, input.diameterM);
  const L = Math.max(0.5, input.tangentLengthM);
  const elev = Math.max(0, input.elevationAboveGradeM);
  const fireLimit = Math.max(0.5, input.fireExposureLimitM);

  const vesselHeight =
    isHoriz || isSphere
      ? D
      : L + (input.headType === 'flat' ? 0 : input.headType === 'hemispherical' ? D : D / 2);

  const maxSceneH = Math.max(elev + vesselHeight + 0.8, fireLimit + 0.8);
  const pxPerM = 140 / maxSceneH;
  const gradeY = 178;

  const vesselBottomY = gradeY - elev * pxPerM;
  const vesselTopY = vesselBottomY - vesselHeight * pxPerM;
  const fireLimitY = Math.max(12, gradeY - fireLimit * pxPerM);

  const liquidTopRelM = Math.min(input.relievingLiquidLevelM, vesselHeight);
  const liquidTopY = vesselBottomY - liquidTopRelM * pxPerM;
  const effWettedTopY = Math.max(liquidTopY, fireLimitY);

  const centerX = 170;
  const widthPx = isHoriz
    ? Math.min(200, Math.max(90, (L + D * 0.5) * pxPerM))
    : Math.min(110, Math.max(46, D * pxPerM));
  const heightPx = Math.max(24, vesselBottomY - vesselTopY);

  const extraOrPipingM2 =
    result.additionalEquipmentWettedAreaM2 + result.pipingAllowanceM2;

  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-800">
          Primary Vessel Wetted Surface Schematic
        </span>
        <span className="text-[11px] font-mono text-slate-600 tabular-nums">
          Total A_w = {result.totalWettedAreaM2.toFixed(2)} m²
        </span>
      </div>
      {extraOrPipingM2 > 0 && (
        <div className="text-[11px] text-slate-500 mb-2 tabular-nums">
          Includes +{result.additionalEquipmentWettedAreaM2.toFixed(2)} m² additional equipment &amp; +{result.pipingAllowanceM2.toFixed(2)} m² piping allowance
        </div>
      )}
      <svg
        viewBox="0 0 380 205"
        className="w-full h-auto max-h-56 bg-slate-50 rounded border border-slate-100"
        role="img"
        aria-label="Vessel fire exposure and wetted surface area schematic"
      >
        <defs>
          <clipPath id="vesselClip">
            {isSphere ? (
              <circle
                cx={centerX}
                cy={vesselTopY + heightPx / 2}
                r={heightPx / 2}
              />
            ) : (
              <rect
                x={centerX - widthPx / 2}
                y={vesselTopY}
                width={widthPx}
                height={heightPx}
                rx={isHoriz ? heightPx / 2 : widthPx * 0.35}
                ry={isHoriz ? heightPx / 2 : Math.min(22, widthPx * 0.28)}
              />
            )}
          </clipPath>
        </defs>

        {/* Grade line */}
        <line x1={20} y1={gradeY} x2={360} y2={gradeY} stroke="#475569" strokeWidth={2} />
        <text x={24} y={gradeY + 14} fontSize={10} fill="#475569">
          Grade (0.0 m)
        </text>

        {/* Pool fire glow region below fire limit */}
        <rect
          x={centerX - widthPx / 2 - 22}
          y={fireLimitY}
          width={widthPx + 44}
          height={Math.max(0, gradeY - fireLimitY)}
          fill="#fef3c7"
          opacity={0.45}
        />

        {/* Liquid fill inside vessel */}
        <g clipPath="url(#vesselClip)">
          <rect
            x={centerX - widthPx / 2 - 4}
            y={liquidTopY}
            width={widthPx + 8}
            height={Math.max(0, vesselBottomY - liquidTopY + 4)}
            fill="#dbeafe"
          />
          {/* Fire-exposed wetted region */}
          <rect
            x={centerX - widthPx / 2 - 4}
            y={effWettedTopY}
            width={widthPx + 8}
            height={Math.max(0, vesselBottomY - effWettedTopY + 4)}
            fill="#f59e0b"
            opacity={0.45}
          />
        </g>

        {/* Vessel outline */}
        {isSphere ? (
          <circle
            cx={centerX}
            cy={vesselTopY + heightPx / 2}
            r={heightPx / 2}
            fill="none"
            stroke="#0f172a"
            strokeWidth={2}
          />
        ) : (
          <rect
            x={centerX - widthPx / 2}
            y={vesselTopY}
            width={widthPx}
            height={heightPx}
            rx={isHoriz ? heightPx / 2 : widthPx * 0.35}
            ry={isHoriz ? heightPx / 2 : Math.min(22, widthPx * 0.28)}
            fill="none"
            stroke="#0f172a"
            strokeWidth={2}
          />
        )}

        {/* Liquid level marker */}
        <line
          x1={centerX - widthPx / 2 - 8}
          y1={liquidTopY}
          x2={centerX + widthPx / 2 + 8}
          y2={liquidTopY}
          stroke="#1d4ed8"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
        <text
          x={centerX + widthPx / 2 + 12}
          y={liquidTopY + 3}
          fontSize={10}
          fill="#1d4ed8"
        >
          Liq. Level ({input.relievingLiquidLevelM.toFixed(2)} m)
        </text>

        {/* Fire exposure limit line */}
        <line
          x1={25}
          y1={fireLimitY}
          x2={355}
          y2={fireLimitY}
          stroke="#dc2626"
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
        <text x={24} y={fireLimitY - 4} fontSize={10} fill="#dc2626" fontWeight="600">
          Fire Limit ({input.fireExposureLimitM.toFixed(2)} m)
        </text>

        {/* Legend */}
        <rect x={24} y={12} width={10} height={10} fill="#f59e0b" opacity={0.6} stroke="#d97706" />
        <text x={38} y={21} fontSize={10} fill="#334155">
          Fire-Exposed Wetted Region
        </text>
        <rect x={185} y={12} width={10} height={10} fill="#dbeafe" stroke="#93c5fd" />
        <text x={199} y={21} fontSize={10} fill="#334155">
          Liquid Above Fire Limit
        </text>
      </svg>
    </div>
  );
};
