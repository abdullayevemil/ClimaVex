import { getRiskLevel, scoreClimateRisk, type ClimateScoringInput } from "./risk-scoring";
import type {
  CreditRecommendation,
  DataSourceSignal,
  FactorContribution,
  Locale,
  LoanReviewResult,
  LongRangeProjection,
  RiskLevel,
} from "./types";

type LoanReviewInput = {
  cropType: string;
  regionName: string;
  requestedAmount: number;
  tenorYears: number;
  climate: ClimateScoringInput;
  locale?: Locale;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits = 1) => {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
};

const score5ToLevel = (score5: number): RiskLevel =>
  getRiskLevel(clamp(score5 * 20));

function cropSensitivityMultiplier(cropType: string) {
  const normalized = cropType.toLowerCase();

  if (normalized.includes("wheat") || normalized.includes("buğda") || normalized.includes("buğday")) {
    return 1.0;
  }

  if (normalized.includes("cotton") || normalized.includes("pambıq") || normalized.includes("pamuk")) {
    return 1.06;
  }

  if (normalized.includes("greenhouse") || normalized.includes("sera") || normalized.includes("istixana")) {
    return 0.92;
  }

  return 1;
}

function displayLevel(score5: number, locale: Locale) {
  if (score5 < 2) return locale === "tr" ? "Düşük" : locale === "az" ? "Aşağı" : "Low";
  if (score5 < 3) return locale === "tr" ? "Orta" : locale === "az" ? "Orta" : "Medium";
  if (score5 < 3.6) {
    return locale === "tr"
      ? "Orta-Yüksek"
      : locale === "az"
        ? "Orta-Yüksək"
        : "Medium-High";
  }
  return locale === "tr" ? "Yüksek" : locale === "az" ? "Yüksək" : "High";
}

function factorContributions(
  input: ClimateScoringInput,
  locale: Locale,
): FactorContribution[] {
  const labels = {
    en: {
      drought: "Drought probability",
      temperature: "Temperature anomaly trend",
      soil: "Soil degradation index",
      flood: "Flood exposure",
      vegetation: "Vegetation health trend",
    },
    az: {
      drought: "Quraqlıq ehtimalı",
      temperature: "Temperatur anomaliyası trendi",
      soil: "Torpaq deqradasiyası indeksi",
      flood: "Daşqın ekspozisiyası",
      vegetation: "Bitki sağlamlığı trendi",
    },
    tr: {
      drought: "Kuraklık olasılığı",
      temperature: "Sıcaklık anomalisi trendi",
      soil: "Toprak bozulma endeksi",
      flood: "Sel maruziyeti",
      vegetation: "Bitki sağlığı trendi",
    },
  }[locale];

  const explanation = {
    en: {
      drought:
        "Karaman has experienced repeated below-average spring rainfall, increasing drought pressure compared with the 2000-2020 baseline proxy.",
      temperature:
        "Recent seasonal temperatures are above the wheat comfort band, adding heat stress during the repayment horizon.",
      soil:
        "Root-zone moisture is low and the degradation proxy is elevated, weakening resilience under dry years.",
      flood:
        "Flood exposure is below the district benchmark, which offsets a small part of the aggregate climate risk.",
      vegetation:
        "The latest vegetation index has softened, signaling crop vigor deterioration over the last 30-day proxy window.",
    },
    az: {
      drought:
        "Karaman üzrə yaz yağıntıları ardıcıl olaraq normadan aşağıdır və 2000-2020 baza proksisi ilə müqayisədə quraqlıq təzyiqini artırır.",
      temperature:
        "Son mövsümi temperatur buğdanın komfort diapazonundan yüksəkdir və ödəmə horizontunda istilik stressi yaradır.",
      soil:
        "Kök zonasında rütubət aşağıdır və deqradasiya proksisi yüksəlib; quru illərdə dayanıqlıq zəifləyir.",
      flood:
        "Daşqın ekspozisiyası rayon göstəricisindən aşağıdır və ümumi iqlim riskini bir qədər azaldır.",
      vegetation:
        "Son bitki örtüyü indeksi zəifləyib və son 30 günlük proksi pəncərədə məhsul canlılığının pisləşdiyini göstərir.",
    },
    tr: {
      drought:
        "Karaman'da bahar yağışları tekrar tekrar ortalamanın altında kaldı ve 2000-2020 baz proksisine göre kuraklık baskısını artırdı.",
      temperature:
        "Son sezon sıcaklıkları buğday konfor bandının üzerinde; geri ödeme ufkunda sıcaklık stresi ekliyor.",
      soil:
        "Kök bölgesi nemi düşük ve bozulma proksisi yüksek; kuru yıllarda dayanıklılık zayıflıyor.",
      flood:
        "Sel maruziyeti ilçe eşiğinin altında ve toplam iklim riskini sınırlı ölçüde azaltıyor.",
      vegetation:
        "Son bitki örtüsü endeksi yumuşadı ve son 30 günlük proksi pencerede ürün canlılığında bozulma sinyali veriyor.",
    },
  }[locale];

  return [
    {
      id: "drought",
      label: labels.drought,
      value: round(0.35 + (input.droughtIndex / 100) * 0.5),
      explanation: explanation.drought,
    },
    {
      id: "temperature",
      label: labels.temperature,
      value: round(Math.max(0.1, (input.temperatureC - 28) / 14)),
      explanation: explanation.temperature,
    },
    {
      id: "soil",
      label: labels.soil,
      value: round(Math.max(0.1, (45 - input.soilMoisture) / 90)),
      explanation: explanation.soil,
    },
    {
      id: "flood",
      label: labels.flood,
      value: input.floodExposure < 25 ? -0.2 : round(input.floodExposure / 180),
      explanation: explanation.flood,
    },
    {
      id: "vegetation",
      label: labels.vegetation,
      value: round(Math.max(0.1, (0.52 - input.vegetationIndex) * 0.45)),
      explanation: explanation.vegetation,
    },
  ];
}

function projectionNote(
  scenario: LongRangeProjection["scenario"],
  year: LongRangeProjection["year"],
  multiplier: number,
  locale: Locale,
) {
  if (locale === "az") {
    return `${scenario} üzrə ${year}-ci ilə qədər quraqlıq tezliyi cari şərtlərə nisbətən təxminən ${multiplier.toFixed(
      1,
    )}x ola bilər.`;
  }

  if (locale === "tr") {
    return `${scenario} altında ${year} itibarıyla kuraklık sıklığı mevcut koşullara göre yaklaşık ${multiplier.toFixed(
      1,
    )}x olabilir.`;
  }

  return `Under ${scenario}, drought frequency is projected at about ${multiplier.toFixed(
    1,
  )}x current conditions by ${year}.`;
}

function longRangeProjections(
  baseScore5: number,
  locale: Locale,
): LongRangeProjection[] {
  const config: Array<{
    scenario: LongRangeProjection["scenario"];
    delta2030: number;
    delta2050: number;
    multiplier2030: number;
    multiplier2050: number;
  }> = [
    {
      scenario: "SSP1-2.6",
      delta2030: 0.4,
      delta2050: 0.7,
      multiplier2030: 1.3,
      multiplier2050: 1.6,
    },
    {
      scenario: "SSP2-4.5",
      delta2030: 0.7,
      delta2050: 1.1,
      multiplier2030: 1.5,
      multiplier2050: 2.1,
    },
    {
      scenario: "SSP5-8.5",
      delta2030: 1.0,
      delta2050: 1.5,
      multiplier2030: 1.8,
      multiplier2050: 2.7,
    },
  ];

  return config.flatMap((item) =>
    [
      { year: 2026 as const, delta: 0, spread: 0.2, multiplier: 1 },
      {
        year: 2030 as const,
        delta: item.delta2030,
        spread: 0.3,
        multiplier: item.multiplier2030,
      },
      {
        year: 2050 as const,
        delta: item.delta2050,
        spread: 0.4,
        multiplier: item.multiplier2050,
      },
    ].map((period) => {
      const score5 = round(Math.min(5, baseScore5 + period.delta));

      return {
        scenario: item.scenario,
        year: period.year,
        score5,
        confidenceLow: round(Math.max(1, score5 - period.spread)),
        confidenceHigh: round(Math.min(5, score5 + period.spread)),
        riskLevel: score5ToLevel(score5),
        droughtFrequencyMultiplier: period.multiplier,
        note: projectionNote(item.scenario, period.year, period.multiplier, locale),
      };
    }),
  );
}

function creditRecommendation(
  score5: number,
  locale: Locale,
): CreditRecommendation {
  const recommendedLtv = score5 >= 3.6 ? 55 : score5 >= 3 ? 58 : 64;
  const provisioningRateIncrease = score5 >= 3.6 ? 18 : score5 >= 3 ? 15 : 8;
  const insuranceRequirement =
    locale === "tr"
      ? "Zorunlu TARSİM kuraklık teminatı"
      : locale === "az"
        ? "Məcburi TARSİM quraqlıq təminatı"
        : "Mandatory TARSİM drought coverage";

  const summary =
    locale === "tr"
      ? `Projeksiyon dikkate alındığında ClimaVex, 7+ yıl tarımsal krediler için azami LTV'nin %70'ten %${recommendedLtv}'e düşürülmesini, karşılık oranının %${provisioningRateIncrease} artırılmasını ve ${insuranceRequirement.toLowerCase()} şartı konulmasını önerir.`
      : locale === "az"
        ? `Proqnoz trayektoriyasına əsasən ClimaVex 7+ illik kənd təsərrüfatı kreditləri üçün maksimum LTV-ni 70%-dən ${recommendedLtv}%-ə endirməyi, ehtiyat normasını ${provisioningRateIncrease}% artırmağı və ${insuranceRequirement.toLowerCase()} tələbini tövsiyə edir.`
        : `Based on the projected climate trajectory, ClimaVex recommends reducing maximum LTV from 70% to ${recommendedLtv}% for 7+ year agricultural loans, increasing provisioning rate by ${provisioningRateIncrease}%, and requiring ${insuranceRequirement.toLowerCase()} as a disbursement condition.`;

  return {
    baselineLtv: 70,
    recommendedLtv,
    provisioningRateIncrease,
    insuranceRequirement,
    summary,
  };
}

function dataSources(input: ClimateScoringInput, locale: Locale): DataSourceSignal[] {
  const demoMode =
    locale === "tr"
      ? "MVP demo proksisi; canlı bağlayıcı için hazır"
      : locale === "az"
        ? "MVP demo proksisi; canlı konnektor üçün hazır"
        : "MVP demo proxy; live connector ready";

  return [
    {
      label: "Sentinel-2 NDVI",
      window: locale === "en" ? "Last 30 days" : locale === "tr" ? "Son 30 gün" : "Son 30 gün",
      value: input.vegetationIndex.toFixed(2),
      mode: demoMode,
    },
    {
      label: "MGM precipitation anomaly",
      window:
        locale === "en"
          ? "Last 12 months"
          : locale === "tr"
            ? "Son 12 ay"
            : "Son 12 ay",
      value: `${Math.round(((input.rainfallMm - 55) / 55) * 100)}%`,
      mode: demoMode,
    },
    {
      label: locale === "tr" ? "Toprak nemi ve bozulma" : locale === "az" ? "Torpaq rütubəti və deqradasiya" : "Soil moisture and degradation",
      window:
        locale === "en"
          ? "Current seasonal snapshot"
          : locale === "tr"
            ? "Cari sezon gözlemi"
            : "Cari mövsüm müşahidəsi",
      value: `${input.soilMoisture.toFixed(0)}%`,
      mode: demoMode,
    },
    {
      label: "XGBoost-ready feature vector",
      window: locale === "en" ? "Scoring runtime" : locale === "tr" ? "Skorlama zamanı" : "Qiymətləndirmə vaxtı",
      value: "6 climate features",
      mode:
        locale === "tr"
          ? "MVP heuristik skorlayıcı"
          : locale === "az"
            ? "MVP heuristik qiymətləndirici"
            : "MVP heuristic scorer",
    },
  ];
}

export function buildLoanReviewResult({
  cropType,
  regionName: _regionName,
  requestedAmount: _requestedAmount,
  tenorYears: _tenorYears,
  climate,
  locale = "en",
}: LoanReviewInput): LoanReviewResult {
  const base = scoreClimateRisk(climate, locale);
  const adjustedScore = round(clamp(base.riskScore * cropSensitivityMultiplier(cropType)));
  const score5 = round(adjustedScore / 20);

  return {
    riskScore: adjustedScore,
    score5,
    riskLevel: getRiskLevel(adjustedScore),
    displayLevel: displayLevel(score5, locale),
    modelMode:
      locale === "tr"
        ? "XGBoost'e hazır özellik hattı; MVP heuristik risk skoru"
        : locale === "az"
          ? "XGBoost üçün hazır xüsusiyyət xətti; MVP heuristik risk balı"
          : "XGBoost-ready feature pipeline; MVP heuristic risk score",
    latencyMs: 3400,
    factorContributions: factorContributions(climate, locale),
    projections: longRangeProjections(score5, locale),
    creditRecommendation: creditRecommendation(score5, locale),
    dataSources: dataSources(climate, locale),
  };
}
