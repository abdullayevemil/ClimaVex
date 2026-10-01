import type { Locale, RiskLevel } from "./types";

export type ClimateScoringInput = {
  rainfallMm: number;
  temperatureC: number;
  soilMoisture: number;
  vegetationIndex: number;
  droughtIndex: number;
  floodExposure: number;
};

export type RiskScoringResult = {
  riskScore: number;
  riskLevel: RiskLevel;
  droughtRisk: number;
  floodRisk: number;
  soilRisk: number;
  yieldVolatilityRisk: number;
  explanation: string;
  financialInterpretation: string;
  recommendation: string;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 10) / 10;

function scoreBelow(value: number, healthyFloor: number, criticalFloor: number) {
  if (value >= healthyFloor) return 0;
  if (value <= criticalFloor) return 100;
  return ((healthyFloor - value) / (healthyFloor - criticalFloor)) * 100;
}

function scoreAbove(value: number, healthyCeiling: number, criticalCeiling: number) {
  if (value <= healthyCeiling) return 0;
  if (value >= criticalCeiling) return 100;
  return ((value - healthyCeiling) / (criticalCeiling - healthyCeiling)) * 100;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score < 40) return "LOW";
  if (score < 70) return "MEDIUM";
  return "HIGH";
}

export function scoreClimateRisk(
  input: ClimateScoringInput,
  locale: Locale = "en",
): RiskScoringResult {
  const rainfallDeficit = scoreBelow(input.rainfallMm, 55, 18);
  const rainfallExcess = scoreAbove(input.rainfallMm, 115, 190);
  const heatStress = scoreAbove(input.temperatureC, 29, 40);
  const lowSoilMoisture = scoreBelow(input.soilMoisture, 44, 18);
  const saturatedSoil = scoreAbove(input.soilMoisture, 74, 94);
  const vegetationStress = scoreBelow(input.vegetationIndex, 0.62, 0.28);

  const droughtRisk = clamp(
    input.droughtIndex * 0.42 +
      rainfallDeficit * 0.24 +
      lowSoilMoisture * 0.2 +
      heatStress * 0.08 +
      vegetationStress * 0.06,
  );

  const floodRisk = clamp(
    input.floodExposure * 0.55 + rainfallExcess * 0.3 + saturatedSoil * 0.15,
  );

  const soilRisk = clamp(
    lowSoilMoisture * 0.45 +
      saturatedSoil * 0.18 +
      vegetationStress * 0.22 +
      input.droughtIndex * 0.15,
  );

  const yieldVolatilityRisk = clamp(
    droughtRisk * 0.33 +
      floodRisk * 0.2 +
      soilRisk * 0.24 +
      heatStress * 0.14 +
      vegetationStress * 0.09,
  );

  const riskScore = round(
    clamp(
      droughtRisk * 0.34 +
        floodRisk * 0.22 +
        soilRisk * 0.2 +
        yieldVolatilityRisk * 0.24,
    ),
  );

  const riskLevel = getRiskLevel(riskScore);

  return {
    riskScore,
    riskLevel,
    droughtRisk: round(droughtRisk),
    floodRisk: round(floodRisk),
    soilRisk: round(soilRisk),
    yieldVolatilityRisk: round(yieldVolatilityRisk),
    explanation: buildExplanation(input, riskLevel, riskScore, {
      droughtRisk,
      floodRisk,
      soilRisk,
      yieldVolatilityRisk,
    }, locale),
    financialInterpretation: buildFinancialInterpretation(riskLevel, riskScore, locale),
    recommendation: buildRecommendation(riskLevel, locale),
  };
}

/** One observed month as the ML service reports it. */
export type ModelObservation = {
  asOf: string | null;
  riskScore: number;
  subScores: { drought: number; flood: number; heat: number; soil: number; vegetation: number };
  rainfallMm: number;
  temperatureC: number;
  soilMoisturePct: number;
  vegetationIndex: number;
};

export type ModelForecastNote = {
  targetYear: number;
  targetMonth: number;
  predictedSoilAnomaly: number;
} | null;

/**
 * The same result shape as `scoreClimateRisk`, filled from the ML service
 * instead of the heuristic. Nothing is re-derived here: the score and the
 * sub-scores are the service's own. The dashboard's fourth bar, "yield
 * volatility", takes the service's vegetation stress — its NDVI-based yield
 * proxy. Heat stress has no bar of its own and is reported in the explanation.
 */
export function scoreFromModel(
  observation: ModelObservation,
  forecast: ModelForecastNote,
  locale: Locale = "en",
): RiskScoringResult {
  const riskScore = round(observation.riskScore);
  const riskLevel = getRiskLevel(riskScore);
  const s = observation.subScores;
  const asOf = observation.asOf ?? "—";
  const sigma = forecast
    ? `${forecast.predictedSoilAnomaly >= 0 ? "+" : ""}${forecast.predictedSoilAnomaly.toFixed(2)}σ`
    : null;
  const target = forecast ? `${String(forecast.targetMonth).padStart(2, "0")}/${forecast.targetYear}` : null;
  const readings = `${observation.rainfallMm.toFixed(0)} mm, ${observation.temperatureC.toFixed(1)} °C, ${observation.soilMoisturePct.toFixed(0)}%, NDVI ${observation.vegetationIndex.toFixed(2)}`;
  const scores = `${s.drought.toFixed(0)} / ${s.flood.toFixed(0)} / ${s.heat.toFixed(0)} / ${s.soil.toFixed(0)} / ${s.vegetation.toFixed(0)}`;

  const explanation = {
    en: `ClimaVex ML service: measured climate-stress index ${riskScore}/100 for ${asOf}, from Sentinel-2 NDVI and ERA5 reanalysis scored against the region's own climatology. Drought / flood / heat / soil / vegetation sub-scores: ${scores}. Observed rainfall, temperature, soil moisture and vegetation: ${readings}.${
      sigma ? ` XGBoost forecast for ${target}: root-zone soil moisture ${sigma} from the seasonal normal.` : ""
    }`,
    az: `ClimaVex ML xidməti: ${asOf} üçün ölçülmüş iqlim stressi indeksi ${riskScore}/100; Sentinel-2 NDVI və ERA5 reanaliz məlumatları regionun öz iqlim normasına görə qiymətləndirilib. Quraqlıq / daşqın / istilik / torpaq / bitki örtüyü alt balları: ${scores}. Müşahidə olunan yağıntı, temperatur, torpaq rütubəti və bitki örtüyü: ${readings}.${
      sigma ? ` ${target} üçün XGBoost proqnozu: kök zonasında torpaq rütubəti mövsümi normadan ${sigma}.` : ""
    }`,
    tr: `ClimaVex ML servisi: ${asOf} için ölçülen iklim stresi endeksi ${riskScore}/100; Sentinel-2 NDVI ve ERA5 yeniden analiz verileri bölgenin kendi klimatolojisine göre puanlandı. Kuraklık / sel / sıcaklık / toprak / bitki örtüsü alt skorları: ${scores}. Gözlenen yağış, sıcaklık, toprak nemi ve bitki örtüsü: ${readings}.${
      sigma ? ` ${target} için XGBoost tahmini: kök bölgesi toprak nemi mevsim normalinden ${sigma}.` : ""
    }`,
  }[locale];

  return {
    riskScore,
    riskLevel,
    droughtRisk: round(s.drought),
    floodRisk: round(s.flood),
    soilRisk: round(s.soil),
    yieldVolatilityRisk: round(s.vegetation),
    explanation,
    financialInterpretation: buildFinancialInterpretation(riskLevel, riskScore, locale),
    recommendation: buildRecommendation(riskLevel, locale),
  };
}

function buildExplanation(
  input: ClimateScoringInput,
  riskLevel: RiskLevel,
  riskScore: number,
  components: Pick<
    RiskScoringResult,
    "droughtRisk" | "floodRisk" | "soilRisk" | "yieldVolatilityRisk"
  >,
  locale: Locale,
) {
  const dominant = Object.entries(components).sort((a, b) => b[1] - a[1])[0][0];
  const driver = driverLabels[locale][dominant as keyof typeof driverLabels.en];
  const level = riskLevelLabels[locale][riskLevel].toLowerCase();

  if (locale === "az") {
    return `MVP iqlim riski qiymətləndirmə modeli ${riskScore} bal ilə ${level} risk profili təyin edir. Əsas amil ${driver}; hesablamada ${input.rainfallMm.toFixed(
      0,
    )} mm yağıntı, ${input.temperatureC.toFixed(
      1,
    )} C temperatur, ${input.soilMoisture.toFixed(
      0,
    )}% torpaq rütubəti və ${input.vegetationIndex.toFixed(2)} bitki örtüyü indeksi nəzərə alınıb.`;
  }

  if (locale === "tr") {
    return `MVP iklim riski skorlama modeli ${riskScore} skoruyla ${level} risk profili atar. Ana etken ${driver}; hesaplama ${input.rainfallMm.toFixed(
      0,
    )} mm yağış, ${input.temperatureC.toFixed(
      1,
    )} C sıcaklık, %${input.soilMoisture.toFixed(
      0,
    )} toprak nemi ve ${input.vegetationIndex.toFixed(2)} bitki örtüsü endeksine dayanır.`;
  }

  return `The MVP climate risk scoring model assigns a ${level} risk profile with a score of ${riskScore}. The primary driver is ${driver}, based on ${input.rainfallMm.toFixed(
    0,
  )} mm rainfall, ${input.temperatureC.toFixed(1)} C temperature, ${input.soilMoisture.toFixed(
    0,
  )}% soil moisture, and vegetation index ${input.vegetationIndex.toFixed(2)}.`;
}

function buildFinancialInterpretation(
  riskLevel: RiskLevel,
  riskScore: number,
  locale: Locale,
) {
  if (locale === "az") {
    if (riskLevel === "HIGH") {
      return `${riskScore} bal səviyyəsində bu ekspozisiya yüksəlmiş kredit və anderraytinq riski kimi qəbul edilməlidir. Banklar daha sərt girov baxışı aparmalı, sığorta tərəfdaşları zərər ehtimalını qiymətə daxil etməli, dövlət qurumları isə mövsümi maliyyələşdirmə qərarlarından əvvəl monitorinqi prioritetləşdirməlidir.`;
    }

    if (riskLevel === "MEDIUM") {
      return `${riskScore} bal bu regionda idarəolunan, lakin əhəmiyyətli iqlim həssaslığı olduğunu göstərir. Kredit komandaları ekspozisiyanı artırmazdan əvvəl ödəniş ehtiyatlarını, məhsul sığortası şərtlərini və konsentrasiya limitlərini nəzərdən keçirməlidir.`;
    }

    return `${riskScore} bal səviyyəsində iqlim stress göstəriciləri hazırda qəbul edilən əməliyyat diapazonundadır. Ekspozisiya standart monitorinqdə saxlanıla bilər və kredit və ya yenilənmə qərarlarından əvvəl mövsümi yoxlama aparılmalıdır.`;
  }

  if (locale === "tr") {
    if (riskLevel === "HIGH") {
      return `${riskScore} seviyesinde bu maruziyet yüksek kredi ve sigortalama riski olarak ele alınmalıdır. Banklar daha sıkı teminat incelemesi yapmalı, sigorta ortakları artan hasar olasılığını fiyatlamalı ve kamu kurumları sezonluk finansman kararlarından önce izlemeyi önceliklendirmelidir.`;
    }

    if (riskLevel === "MEDIUM") {
      return `${riskScore} skoru, bu bölgede yönetilebilir ancak önemli iklim hassasiyeti olduğunu gösterir. Kredi ekipleri maruziyeti artırmadan önce geri ödeme tamponlarını, ürün sigortası koşullarını ve yoğunlaşma limitlerini incelemelidir.`;
    }

    return `${riskScore} seviyesinde iklim stres göstergeleri şu anda kabul edilebilir çalışma bandındadır. Maruziyet standart izleme altında kalabilir; kredi veya yenileme kararlarından önce sezonluk kontroller yapılmalıdır.`;
  }

  if (riskLevel === "HIGH") {
    return `At ${riskScore}, this exposure should be treated as a heightened credit and underwriting risk. Banks may need tighter collateral review, insurance partners may price for elevated loss probability, and agencies should prioritize monitoring before seasonal financing decisions.`;
  }

  if (riskLevel === "MEDIUM") {
    return `At ${riskScore}, this region shows manageable but material climate sensitivity. Credit teams should review repayment buffers, crop insurance attachment points, and concentration limits before expanding exposure.`;
  }

  return `At ${riskScore}, climate stress indicators are currently within an acceptable operating band. The exposure can remain in standard monitoring, with routine seasonal checks before lending or renewal decisions.`;
}

function buildRecommendation(riskLevel: RiskLevel, locale: Locale) {
  if (locale === "az") {
    if (riskLevel === "HIGH") {
      return "Portfel risk baxışına eskalasiya edin, yenilənmiş aqronomik sübut tələb edin, daha aşağı avans dərəcələrini nəzərdən keçirin və yeni vəsait ayırmadan əvvəl risk transferi və ya azaldıcı tədbirlər tələb edin.";
    }

    if (riskLevel === "MEDIUM") {
      return "Gücləndirilmiş monitorinqlə kredit uyğunluğunu saxlayın, suvarma dayanıqlığını nəzərdən keçirin və konsentrasiya yüksəkdirsə sığorta təminatını və ya kredit şərtlərini tənzimləyin.";
    }

    return "Standart monitorinqi davam etdirin və regionu normal kredit və sığorta prosesləri üçün uyğun saxlayın; iqlim göstəricilərini aylıq yeniləyin.";
  }

  if (locale === "tr") {
    if (riskLevel === "HIGH") {
      return "Portföy risk incelemesine yükseltin, güncel agronomik kanıt isteyin, daha düşük avans oranlarını değerlendirin ve yeni kullandırım öncesinde risk transferi veya azaltıcı önlemler talep edin.";
    }

    if (riskLevel === "MEDIUM") {
      return "Geliştirilmiş izleme ile kredi uygunluğunu koruyun, sulama dayanıklılığını inceleyin ve yoğunlaşma yüksekse sigorta kapsamını veya kredi koşullarını ayarlayın.";
    }

    return "Standart izlemeyi sürdürün ve bölgeyi normal kredi ve sigorta süreçleri için uygun tutun; iklim göstergelerini aylık yenileyin.";
  }

  if (riskLevel === "HIGH") {
    return "Escalate for portfolio risk review, request updated agronomic evidence, consider lower advance rates, and require risk transfer or mitigation measures before new disbursement.";
  }

  if (riskLevel === "MEDIUM") {
    return "Maintain lending eligibility with enhanced monitoring, review irrigation resilience, and adjust insurance coverage or loan covenants where concentration is high.";
  }

  return "Continue standard monitoring and keep the region eligible for normal credit and insurance workflows, while refreshing climate indicators monthly.";
}

const riskLevelLabels: Record<Locale, Record<RiskLevel, string>> = {
  en: { LOW: "low", MEDIUM: "medium", HIGH: "high" },
  az: { LOW: "aşağı", MEDIUM: "orta", HIGH: "yüksək" },
  tr: { LOW: "düşük", MEDIUM: "orta", HIGH: "yüksek" },
};

const driverLabels = {
  en: {
    droughtRisk: "drought pressure",
    floodRisk: "flood exposure",
    soilRisk: "soil stress",
    yieldVolatilityRisk: "yield volatility",
  },
  az: {
    droughtRisk: "quraqlıq təzyiqidir",
    floodRisk: "daşqın ekspozisiyasıdır",
    soilRisk: "torpaq stressidir",
    yieldVolatilityRisk: "məhsuldarlıq volatilliyidir",
  },
  tr: {
    droughtRisk: "kuraklık baskısıdır",
    floodRisk: "sel maruziyetidir",
    soilRisk: "toprak stresidir",
    yieldVolatilityRisk: "verim oynaklığıdır",
  },
};
