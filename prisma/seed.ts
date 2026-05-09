import {
  LoanApplicationStatus,
  PrismaClient,
  RegionType,
  RiskLevel as PrismaRiskLevel,
} from "@prisma/client";
import { dbLocales, supportedLocales } from "../src/lib/i18n";
import { scoreClimateRisk, type ClimateScoringInput } from "../src/lib/risk-scoring";
import type { Locale } from "../src/lib/types";

const prisma = new PrismaClient();

type SeedRegion = {
  id: string;
  name: string;
  type: RegionType;
  country: string;
  latitude: number;
  longitude: number;
  areaHectares: number;
  cropType: string;
  boundaryCoordinates: Array<[number, number]>;
  translations: Record<
    Locale,
    {
      name: string;
      country: string;
      cropType: string;
    }
  >;
  exposureAmount: number;
  climate: ClimateScoringInput[];
};

const dates = [
  "2025-05-01",
  "2025-06-01",
  "2025-07-01",
  "2025-08-01",
  "2025-09-01",
  "2025-10-01",
  "2025-11-01",
  "2025-12-01",
  "2026-01-01",
  "2026-02-01",
  "2026-03-01",
  "2026-04-01",
];

const regions: SeedRegion[] = [
  {
    id: "konya-wheat-district",
    name: "Konya Wheat District",
    type: RegionType.DISTRICT,
    country: "Turkey",
    latitude: 37.8746,
    longitude: 32.4932,
    areaHectares: 245000,
    cropType: "Winter wheat",
    boundaryCoordinates: [
      [38.185, 32.115],
      [38.245, 32.305],
      [38.198, 32.548],
      [38.105, 32.812],
      [37.976, 33.045],
      [37.812, 33.118],
      [37.628, 32.984],
      [37.515, 32.742],
      [37.548, 32.492],
      [37.655, 32.274],
      [37.842, 32.082],
      [38.012, 32.018],
    ],
    translations: {
      en: {
        name: "Konya Wheat District",
        country: "Turkey",
        cropType: "Winter wheat",
      },
      az: {
        name: "Konya Buğda Rayonu",
        country: "Türkiyə",
        cropType: "Payızlıq buğda",
      },
      tr: {
        name: "Konya Buğday Bölgesi",
        country: "Türkiye",
        cropType: "Kışlık buğday",
      },
    },
    exposureAmount: 42000000,
    climate: [
      { rainfallMm: 38, temperatureC: 20.8, soilMoisture: 41, vegetationIndex: 0.61, droughtIndex: 49, floodExposure: 12 },
      { rainfallMm: 24, temperatureC: 27.1, soilMoisture: 34, vegetationIndex: 0.55, droughtIndex: 62, floodExposure: 10 },
      { rainfallMm: 13, temperatureC: 32.5, soilMoisture: 25, vegetationIndex: 0.47, droughtIndex: 77, floodExposure: 8 },
      { rainfallMm: 9, temperatureC: 34.2, soilMoisture: 22, vegetationIndex: 0.42, droughtIndex: 84, floodExposure: 7 },
      { rainfallMm: 18, temperatureC: 29.4, soilMoisture: 29, vegetationIndex: 0.48, droughtIndex: 70, floodExposure: 9 },
      { rainfallMm: 41, temperatureC: 22.1, soilMoisture: 43, vegetationIndex: 0.58, droughtIndex: 51, floodExposure: 13 },
      { rainfallMm: 52, temperatureC: 14.2, soilMoisture: 50, vegetationIndex: 0.62, droughtIndex: 38, floodExposure: 16 },
      { rainfallMm: 64, temperatureC: 6.7, soilMoisture: 57, vegetationIndex: 0.65, droughtIndex: 31, floodExposure: 19 },
      { rainfallMm: 72, temperatureC: 3.4, soilMoisture: 61, vegetationIndex: 0.67, droughtIndex: 26, floodExposure: 21 },
      { rainfallMm: 58, temperatureC: 6.2, soilMoisture: 56, vegetationIndex: 0.66, droughtIndex: 30, floodExposure: 18 },
      { rainfallMm: 46, temperatureC: 11.8, soilMoisture: 49, vegetationIndex: 0.63, droughtIndex: 37, floodExposure: 15 },
      { rainfallMm: 16, temperatureC: 28.3, soilMoisture: 27, vegetationIndex: 0.48, droughtIndex: 72, floodExposure: 9 },
    ],
  },
  {
    id: "karaman-mustafa-demir-wheat-farm",
    name: "Mustafa Demir Wheat Farm",
    type: RegionType.FARM,
    country: "Turkey",
    latitude: 37.1811,
    longitude: 33.215,
    areaHectares: 180,
    cropType: "Winter wheat",
    boundaryCoordinates: [
      [37.238, 33.072],
      [37.268, 33.142],
      [37.254, 33.236],
      [37.219, 33.326],
      [37.156, 33.374],
      [37.102, 33.332],
      [37.074, 33.244],
      [37.092, 33.154],
      [37.132, 33.084],
      [37.188, 33.052],
    ],
    translations: {
      en: {
        name: "Mustafa Demir Wheat Farm",
        country: "Turkey",
        cropType: "Winter wheat",
      },
      az: {
        name: "Mustafa Demir Buğda Ferması",
        country: "Türkiyə",
        cropType: "Payızlıq buğda",
      },
      tr: {
        name: "Mustafa Demir Buğday Çiftliği",
        country: "Türkiye",
        cropType: "Kışlık buğday",
      },
    },
    exposureAmount: 800000,
    climate: [
      { rainfallMm: 42, temperatureC: 19.9, soilMoisture: 44, vegetationIndex: 0.63, droughtIndex: 41, floodExposure: 12 },
      { rainfallMm: 28, temperatureC: 26.8, soilMoisture: 36, vegetationIndex: 0.58, droughtIndex: 55, floodExposure: 10 },
      { rainfallMm: 17, temperatureC: 31.9, soilMoisture: 28, vegetationIndex: 0.5, droughtIndex: 71, floodExposure: 8 },
      { rainfallMm: 12, temperatureC: 33.6, soilMoisture: 24, vegetationIndex: 0.43, droughtIndex: 80, floodExposure: 7 },
      { rainfallMm: 21, temperatureC: 28.8, soilMoisture: 31, vegetationIndex: 0.52, droughtIndex: 62, floodExposure: 9 },
      { rainfallMm: 45, temperatureC: 21.2, soilMoisture: 45, vegetationIndex: 0.6, droughtIndex: 42, floodExposure: 12 },
      { rainfallMm: 58, temperatureC: 12.6, soilMoisture: 51, vegetationIndex: 0.64, droughtIndex: 33, floodExposure: 15 },
      { rainfallMm: 67, temperatureC: 5.8, soilMoisture: 58, vegetationIndex: 0.66, droughtIndex: 28, floodExposure: 17 },
      { rainfallMm: 75, temperatureC: 2.9, soilMoisture: 62, vegetationIndex: 0.67, droughtIndex: 24, floodExposure: 19 },
      { rainfallMm: 55, temperatureC: 6.1, soilMoisture: 54, vegetationIndex: 0.65, droughtIndex: 31, floodExposure: 16 },
      { rainfallMm: 34, temperatureC: 12.3, soilMoisture: 40, vegetationIndex: 0.58, droughtIndex: 49, floodExposure: 13 },
      { rainfallMm: 8, temperatureC: 34.0, soilMoisture: 18, vegetationIndex: 0.3, droughtIndex: 90, floodExposure: 12 },
    ],
  },
  {
    id: "sanliurfa-cotton-zone",
    name: "Şanlıurfa Cotton Zone",
    type: RegionType.DISTRICT,
    country: "Turkey",
    latitude: 37.1674,
    longitude: 38.7955,
    areaHectares: 198000,
    cropType: "Irrigated cotton",
    boundaryCoordinates: [
      [37.525, 38.285],
      [37.602, 38.528],
      [37.552, 38.842],
      [37.435, 39.124],
      [37.262, 39.352],
      [37.025, 39.292],
      [36.872, 39.055],
      [36.782, 38.754],
      [36.838, 38.462],
      [37.012, 38.238],
      [37.265, 38.168],
      [37.428, 38.212],
    ],
    translations: {
      en: {
        name: "Şanlıurfa Cotton Zone",
        country: "Turkey",
        cropType: "Irrigated cotton",
      },
      az: {
        name: "Şanlıurfa Pambıq Zonası",
        country: "Türkiyə",
        cropType: "Suvarılan pambıq",
      },
      tr: {
        name: "Şanlıurfa Pamuk Bölgesi",
        country: "Türkiye",
        cropType: "Sulu pamuk",
      },
    },
    exposureAmount: 36000000,
    climate: [
      { rainfallMm: 32, temperatureC: 24.9, soilMoisture: 47, vegetationIndex: 0.68, droughtIndex: 45, floodExposure: 18 },
      { rainfallMm: 14, temperatureC: 31.4, soilMoisture: 37, vegetationIndex: 0.61, droughtIndex: 64, floodExposure: 15 },
      { rainfallMm: 6, temperatureC: 37.6, soilMoisture: 29, vegetationIndex: 0.52, droughtIndex: 79, floodExposure: 12 },
      { rainfallMm: 4, temperatureC: 39.1, soilMoisture: 26, vegetationIndex: 0.49, droughtIndex: 86, floodExposure: 11 },
      { rainfallMm: 11, temperatureC: 34.8, soilMoisture: 31, vegetationIndex: 0.53, droughtIndex: 76, floodExposure: 13 },
      { rainfallMm: 28, temperatureC: 27.2, soilMoisture: 43, vegetationIndex: 0.62, droughtIndex: 55, floodExposure: 17 },
      { rainfallMm: 61, temperatureC: 18.1, soilMoisture: 58, vegetationIndex: 0.71, droughtIndex: 35, floodExposure: 25 },
      { rainfallMm: 88, temperatureC: 10.2, soilMoisture: 66, vegetationIndex: 0.74, droughtIndex: 24, floodExposure: 33 },
      { rainfallMm: 96, temperatureC: 7.5, soilMoisture: 69, vegetationIndex: 0.75, droughtIndex: 21, floodExposure: 37 },
      { rainfallMm: 73, temperatureC: 9.6, soilMoisture: 63, vegetationIndex: 0.73, droughtIndex: 28, floodExposure: 30 },
      { rainfallMm: 52, temperatureC: 15.4, soilMoisture: 56, vegetationIndex: 0.7, droughtIndex: 36, floodExposure: 24 },
      { rainfallMm: 2, temperatureC: 41.1, soilMoisture: 12, vegetationIndex: 0.22, droughtIndex: 98, floodExposure: 32 },
    ],
  },
  {
    id: "antalya-greenhouse-region",
    name: "Antalya Greenhouse Region",
    type: RegionType.FARM,
    country: "Turkey",
    latitude: 36.8969,
    longitude: 30.7133,
    areaHectares: 82000,
    cropType: "Greenhouse vegetables",
    boundaryCoordinates: [
      [37.165, 29.872],
      [37.248, 30.118],
      [37.214, 30.418],
      [37.118, 30.728],
      [37.004, 31.048],
      [36.858, 31.246],
      [36.702, 31.182],
      [36.615, 30.912],
      [36.582, 30.612],
      [36.648, 30.304],
      [36.782, 30.052],
      [36.948, 29.858],
    ],
    translations: {
      en: {
        name: "Antalya Greenhouse Region",
        country: "Turkey",
        cropType: "Greenhouse vegetables",
      },
      az: {
        name: "Antalya İstixana Regionu",
        country: "Türkiyə",
        cropType: "İstixana tərəvəzləri",
      },
      tr: {
        name: "Antalya Sera Bölgesi",
        country: "Türkiye",
        cropType: "Sera sebzeleri",
      },
    },
    exposureAmount: 28000000,
    climate: [
      { rainfallMm: 44, temperatureC: 22.8, soilMoisture: 61, vegetationIndex: 0.78, droughtIndex: 28, floodExposure: 29 },
      { rainfallMm: 22, temperatureC: 27.6, soilMoisture: 55, vegetationIndex: 0.76, droughtIndex: 37, floodExposure: 24 },
      { rainfallMm: 9, temperatureC: 31.2, soilMoisture: 49, vegetationIndex: 0.73, droughtIndex: 48, floodExposure: 22 },
      { rainfallMm: 7, temperatureC: 32.1, soilMoisture: 47, vegetationIndex: 0.72, droughtIndex: 52, floodExposure: 21 },
      { rainfallMm: 21, temperatureC: 29.3, soilMoisture: 54, vegetationIndex: 0.75, droughtIndex: 39, floodExposure: 26 },
      { rainfallMm: 78, temperatureC: 23.1, soilMoisture: 68, vegetationIndex: 0.79, droughtIndex: 24, floodExposure: 42 },
      { rainfallMm: 141, temperatureC: 17.2, soilMoisture: 76, vegetationIndex: 0.8, droughtIndex: 18, floodExposure: 55 },
      { rainfallMm: 196, temperatureC: 12.5, soilMoisture: 83, vegetationIndex: 0.79, droughtIndex: 12, floodExposure: 68 },
      { rainfallMm: 212, temperatureC: 10.8, soilMoisture: 86, vegetationIndex: 0.78, droughtIndex: 10, floodExposure: 74 },
      { rainfallMm: 164, temperatureC: 12.9, soilMoisture: 80, vegetationIndex: 0.8, droughtIndex: 15, floodExposure: 61 },
      { rainfallMm: 94, temperatureC: 16.7, soilMoisture: 71, vegetationIndex: 0.81, droughtIndex: 22, floodExposure: 43 },
      { rainfallMm: 232, temperatureC: 22.4, soilMoisture: 91, vegetationIndex: 0.35, droughtIndex: 60, floodExposure: 88 },
    ],
  },
  {
    id: "izmir-olive-farms",
    name: "İzmir Olive Farms",
    type: RegionType.FARM,
    country: "Turkey",
    latitude: 38.4237,
    longitude: 27.1428,
    areaHectares: 124000,
    cropType: "Olives",
    boundaryCoordinates: [
      [38.742, 26.585],
      [38.858, 26.842],
      [38.804, 27.126],
      [38.692, 27.442],
      [38.512, 27.674],
      [38.284, 27.618],
      [38.112, 27.396],
      [38.018, 27.072],
      [38.078, 26.758],
      [38.238, 26.502],
      [38.482, 26.418],
      [38.635, 26.472],
    ],
    translations: {
      en: {
        name: "İzmir Olive Farms",
        country: "Turkey",
        cropType: "Olives",
      },
      az: {
        name: "İzmir Zeytun Fermaları",
        country: "Türkiyə",
        cropType: "Zeytun",
      },
      tr: {
        name: "İzmir Zeytin Çiftlikleri",
        country: "Türkiye",
        cropType: "Zeytin",
      },
    },
    exposureAmount: 22000000,
    climate: [
      { rainfallMm: 35, temperatureC: 22.1, soilMoisture: 49, vegetationIndex: 0.66, droughtIndex: 39, floodExposure: 18 },
      { rainfallMm: 16, temperatureC: 27.8, soilMoisture: 40, vegetationIndex: 0.61, droughtIndex: 53, floodExposure: 15 },
      { rainfallMm: 5, temperatureC: 32.6, soilMoisture: 31, vegetationIndex: 0.55, droughtIndex: 69, floodExposure: 12 },
      { rainfallMm: 4, temperatureC: 33.7, soilMoisture: 29, vegetationIndex: 0.52, droughtIndex: 74, floodExposure: 11 },
      { rainfallMm: 18, temperatureC: 29.8, soilMoisture: 38, vegetationIndex: 0.58, droughtIndex: 57, floodExposure: 14 },
      { rainfallMm: 49, temperatureC: 22.4, soilMoisture: 52, vegetationIndex: 0.66, droughtIndex: 36, floodExposure: 19 },
      { rainfallMm: 92, temperatureC: 15.6, soilMoisture: 64, vegetationIndex: 0.7, droughtIndex: 25, floodExposure: 29 },
      { rainfallMm: 126, temperatureC: 9.8, soilMoisture: 71, vegetationIndex: 0.72, droughtIndex: 19, floodExposure: 41 },
      { rainfallMm: 138, temperatureC: 8.4, soilMoisture: 74, vegetationIndex: 0.71, droughtIndex: 17, floodExposure: 45 },
      { rainfallMm: 101, temperatureC: 10.1, soilMoisture: 67, vegetationIndex: 0.72, droughtIndex: 22, floodExposure: 34 },
      { rainfallMm: 68, temperatureC: 14.6, soilMoisture: 59, vegetationIndex: 0.7, droughtIndex: 29, floodExposure: 25 },
      { rainfallMm: 39, temperatureC: 19.5, soilMoisture: 50, vegetationIndex: 0.67, droughtIndex: 37, floodExposure: 19 },
    ],
  },
  {
    id: "central-anatolia-mixed-portfolio-region",
    name: "Central Anatolia Mixed Portfolio",
    type: RegionType.PORTFOLIO,
    country: "Turkey",
    latitude: 39.1,
    longitude: 34.7,
    areaHectares: 610000,
    cropType: "Mixed cereals, pulses, and irrigated crops",
    boundaryCoordinates: [
      [39.842, 33.418],
      [39.982, 33.842],
      [39.886, 34.326],
      [39.962, 34.816],
      [39.752, 35.246],
      [39.512, 35.742],
      [39.145, 35.928],
      [38.802, 35.708],
      [38.548, 35.232],
      [38.438, 34.682],
      [38.552, 34.128],
      [38.842, 33.692],
      [39.245, 33.502],
      [39.592, 33.356],
    ],
    translations: {
      en: {
        name: "Central Anatolia Mixed Portfolio",
        country: "Turkey",
        cropType: "Mixed cereals, pulses, and irrigated crops",
      },
      az: {
        name: "Mərkəzi Anadolu Qarışıq Portfeli",
        country: "Türkiyə",
        cropType: "Taxıl, paxlalılar və suvarılan bitkilər",
      },
      tr: {
        name: "İç Anadolu Karma Portföyü",
        country: "Türkiye",
        cropType: "Tahıllar, baklagiller ve sulu ürünler",
      },
    },
    exposureAmount: 18500000,
    climate: [
      { rainfallMm: 42, temperatureC: 19.4, soilMoisture: 45, vegetationIndex: 0.62, droughtIndex: 44, floodExposure: 15 },
      { rainfallMm: 21, temperatureC: 26.1, soilMoisture: 36, vegetationIndex: 0.57, droughtIndex: 58, floodExposure: 13 },
      { rainfallMm: 11, temperatureC: 31.8, soilMoisture: 28, vegetationIndex: 0.5, droughtIndex: 73, floodExposure: 10 },
      { rainfallMm: 8, temperatureC: 33.3, soilMoisture: 25, vegetationIndex: 0.46, droughtIndex: 81, floodExposure: 9 },
      { rainfallMm: 17, temperatureC: 29.1, soilMoisture: 31, vegetationIndex: 0.51, droughtIndex: 68, floodExposure: 11 },
      { rainfallMm: 39, temperatureC: 21.4, soilMoisture: 44, vegetationIndex: 0.59, droughtIndex: 49, floodExposure: 14 },
      { rainfallMm: 59, temperatureC: 13.1, soilMoisture: 53, vegetationIndex: 0.64, droughtIndex: 35, floodExposure: 18 },
      { rainfallMm: 71, temperatureC: 5.9, soilMoisture: 60, vegetationIndex: 0.66, droughtIndex: 29, floodExposure: 22 },
      { rainfallMm: 82, temperatureC: 2.8, soilMoisture: 63, vegetationIndex: 0.67, droughtIndex: 25, floodExposure: 25 },
      { rainfallMm: 63, temperatureC: 5.4, soilMoisture: 58, vegetationIndex: 0.66, droughtIndex: 30, floodExposure: 20 },
      { rainfallMm: 48, temperatureC: 10.9, soilMoisture: 50, vegetationIndex: 0.63, droughtIndex: 38, floodExposure: 16 },
      { rainfallMm: 15, temperatureC: 30.1, soilMoisture: 28, vegetationIndex: 0.48, droughtIndex: 70, floodExposure: 10 },
    ],
  },
];

async function main() {
  await prisma.climateAlertTranslation.deleteMany();
  await prisma.loanDecision.deleteMany();
  await prisma.climateReport.deleteMany();
  await prisma.loanApplicationTranslation.deleteMany();
  await prisma.loanApplication.deleteMany();
  await prisma.climateAlert.deleteMany();
  await prisma.portfolioTranslation.deleteMany();
  await prisma.riskAssessmentTranslation.deleteMany();
  await prisma.regionTranslation.deleteMany();
  await prisma.portfolioRegion.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.climateSnapshot.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.region.deleteMany();

  for (const region of regions) {
    await prisma.region.create({
      data: {
        id: region.id,
        name: region.name,
        type: region.type,
        country: region.country,
        latitude: region.latitude,
        longitude: region.longitude,
        areaHectares: region.areaHectares,
        cropType: region.cropType,
        boundaryCoordinates: JSON.stringify(region.boundaryCoordinates),
        translations: {
          createMany: {
            data: supportedLocales.map((locale) => ({
              locale: dbLocales[locale],
              ...region.translations[locale],
            })),
          },
        },
      },
    });

    for (const [index, climate] of region.climate.entries()) {
      const date = new Date(`${dates[index]}T09:00:00.000Z`);
      const scoring = scoreClimateRisk(climate);

      await prisma.climateSnapshot.create({
        data: {
          regionId: region.id,
          date,
          rainfallMm: climate.rainfallMm,
          temperatureC: climate.temperatureC,
          soilMoisture: climate.soilMoisture,
          vegetationIndex: climate.vegetationIndex,
          droughtIndex: climate.droughtIndex,
          floodExposure: climate.floodExposure,
        },
      });

      const assessmentInput = {
        rainfallMm: climate.rainfallMm,
        temperatureC: climate.temperatureC,
        soilMoisture: climate.soilMoisture,
        vegetationIndex: climate.vegetationIndex,
        droughtIndex: climate.droughtIndex,
        floodExposure: climate.floodExposure,
      };

      await prisma.riskAssessment.create({
        data: {
          regionId: region.id,
          assessmentDate: date,
          riskLevel: scoring.riskLevel as PrismaRiskLevel,
          riskScore: scoring.riskScore,
          droughtRisk: scoring.droughtRisk,
          floodRisk: scoring.floodRisk,
          soilRisk: scoring.soilRisk,
          yieldVolatilityRisk: scoring.yieldVolatilityRisk,
          explanation: scoring.explanation,
          financialInterpretation: scoring.financialInterpretation,
          recommendation: scoring.recommendation,
          translations: {
            createMany: {
              data: supportedLocales.map((locale) => {
                const localizedScoring = scoreClimateRisk(assessmentInput, locale);

                return {
                  locale: dbLocales[locale],
                  explanation: localizedScoring.explanation,
                  financialInterpretation:
                    localizedScoring.financialInterpretation,
                  recommendation: localizedScoring.recommendation,
                };
              }),
            },
          },
        },
      });
    }
  }

  const portfolio = await prisma.portfolio.create({
    data: {
      id: "central-anatolia-mixed-portfolio",
      name: "Central Anatolia Mixed Portfolio",
      institutionName: "Anatolian Agricultural Finance Group",
      totalExposure: regions.reduce((sum, region) => sum + region.exposureAmount, 0),
      translations: {
        createMany: {
          data: [
            {
              locale: dbLocales.en,
              name: "Central Anatolia Mixed Portfolio",
              institutionName: "Anatolian Agricultural Finance Group",
            },
            {
              locale: dbLocales.az,
              name: "Mərkəzi Anadolu Qarışıq Portfeli",
              institutionName: "Anadolu Kənd Təsərrüfatı Maliyyə Qrupu",
            },
            {
              locale: dbLocales.tr,
              name: "İç Anadolu Karma Portföyü",
              institutionName: "Anadolu Tarımsal Finans Grubu",
            },
          ],
        },
      },
    },
  });

  await prisma.portfolioRegion.createMany({
    data: regions.map((region) => ({
      portfolioId: portfolio.id,
      regionId: region.id,
      exposureAmount: region.exposureAmount,
    })),
  });

  await prisma.loanApplication.create({
    data: {
      id: "loan-mustafa-demir-karaman-wheat",
      applicantName: "Mustafa Demir",
      institutionName: "Anatolian Agricultural Finance Group",
      regionId: "karaman-mustafa-demir-wheat-farm",
      cropType: "Winter wheat",
      areaHectares: 180,
      latitude: 37.1811,
      longitude: 33.215,
      requestedAmount: 800000,
      tenorYears: 7,
      status: LoanApplicationStatus.PENDING_REVIEW,
      submittedAt: new Date("2026-05-09T06:00:00.000Z"),
      translations: {
        createMany: {
          data: [
            {
              locale: dbLocales.en,
              cropType: "Winter wheat",
              locationLabel: "Karaman district",
            },
            {
              locale: dbLocales.az,
              cropType: "Payızlıq buğda",
              locationLabel: "Karaman rayonu",
            },
            {
              locale: dbLocales.tr,
              cropType: "Kışlık buğday",
              locationLabel: "Karaman ilçesi",
            },
          ],
        },
      },
    },
  });

  await prisma.climateAlert.create({
    data: {
      id: "alert-karaman-ndvi-drought-cluster",
      regionId: "karaman-mustafa-demir-wheat-farm",
      severity: PrismaRiskLevel.HIGH,
      title: "Karaman wheat cluster NDVI drop",
      triggerType: "Overnight satellite vegetation alert",
      message:
        "Latest satellite vegetation proxy shows a sharp NDVI decline across a Karaman wheat loan cluster. Stress test review is recommended before new disbursements.",
      exposureAmount: 6400000,
      affectedLoans: 12,
      status: "OPEN",
      createdAt: new Date("2026-05-09T01:55:00.000Z"),
      translations: {
        createMany: {
          data: [
            {
              locale: dbLocales.en,
              title: "Karaman wheat cluster NDVI drop",
              triggerType: "Overnight satellite vegetation alert",
              message:
                "Latest satellite vegetation proxy shows a sharp NDVI decline across a Karaman wheat loan cluster. Stress test review is recommended before new disbursements.",
            },
            {
              locale: dbLocales.az,
              title: "Karaman buğda klasterində NDVI azalması",
              triggerType: "Gecə peyk bitki örtüyü bildirişi",
              message:
                "Son peyk bitki örtüyü proksisi Karaman buğda kredit klasterində kəskin NDVI azalması göstərir. Yeni vəsait ayrılmadan əvvəl stress-test baxışı tövsiyə olunur.",
            },
            {
              locale: dbLocales.tr,
              title: "Karaman buğday kümesinde NDVI düşüşü",
              triggerType: "Gece uydu bitki örtüsü uyarısı",
              message:
                "Son uydu bitki örtüsü göstergesi Karaman buğday kredi kümesinde keskin NDVI düşüşü gösteriyor. Yeni kullandırım öncesinde stres testi incelemesi önerilir.",
            },
          ],
        },
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
