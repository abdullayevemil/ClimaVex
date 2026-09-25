-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "RegionType" AS ENUM ('FARM', 'DISTRICT', 'PORTFOLIO');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'AZ', 'TR');

-- CreateEnum
CREATE TYPE "LoanApplicationStatus" AS ENUM ('PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED_WITH_CONDITIONS', 'DECLINED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FARMER', 'BANK_USER', 'INSURER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GrantScope" AS ENUM ('READ', 'READ_SCENARIO', 'FINANCE_WRITE');

-- CreateEnum
CREATE TYPE "GeometrySource" AS ENUM ('USER_DRAWN', 'GEOJSON_IMPORT', 'DEMO_FIXTURE', 'OFFICIAL_ADAPTER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED_DRAFT', 'USER_CONFIRMED', 'OFFICIALLY_VERIFIED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('WELL', 'PUMP', 'CANAL_CONNECTION');

-- CreateEnum
CREATE TYPE "CashFlowKind" AS ENUM ('OPENING_RESERVE', 'LOAN_DISBURSEMENT', 'SALE_RECEIPT', 'INSURANCE_PAYOUT', 'OPERATING_COST', 'OTHER_OBLIGATION', 'LOAN_REPAYMENT_DUE');

-- CreateEnum
CREATE TYPE "CashFlowSource" AS ENUM ('USER', 'FIXTURE', 'DERIVED');

-- CreateEnum
CREATE TYPE "ScenarioKind" AS ENUM ('BASELINE', 'WEATHER_REPLAY', 'RESOURCE_DISRUPTION');

-- CreateEnum
CREATE TYPE "DateAlignment" AS ENUM ('CALENDAR_DATE', 'DAY_OF_YEAR', 'ALIGN_TO_PLANTING');

-- CreateEnum
CREATE TYPE "WeatherDatasetKind" AS ENUM ('HISTORICAL_OBSERVED', 'DEMO_SYNTHETIC');

-- CreateEnum
CREATE TYPE "CropStage" AS ENUM ('DORMANT', 'SOWING', 'EMERGENCE', 'VEGETATIVE', 'FLOWERING', 'GRAIN_FILL', 'MATURITY', 'HARVEST');

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RegionType" NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "areaHectares" DOUBLE PRECISION NOT NULL,
    "cropType" TEXT NOT NULL,
    "boundaryCoordinates" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionTranslation" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "cropType" TEXT NOT NULL,

    CONSTRAINT "RegionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateSnapshot" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rainfallMm" DOUBLE PRECISION NOT NULL,
    "temperatureC" DOUBLE PRECISION NOT NULL,
    "soilMoisture" DOUBLE PRECISION NOT NULL,
    "vegetationIndex" DOUBLE PRECISION NOT NULL,
    "droughtIndex" DOUBLE PRECISION NOT NULL,
    "floodExposure" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClimateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "droughtRisk" DOUBLE PRECISION NOT NULL,
    "floodRisk" DOUBLE PRECISION NOT NULL,
    "soilRisk" DOUBLE PRECISION NOT NULL,
    "yieldVolatilityRisk" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "financialInterpretation" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessmentTranslation" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "explanation" TEXT NOT NULL,
    "financialInterpretation" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,

    CONSTRAINT "RiskAssessmentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "totalExposure" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioTranslation" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,

    CONSTRAINT "PortfolioTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioRegion" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "exposureAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PortfolioRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplication" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "cropType" TEXT NOT NULL,
    "areaHectares" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "tenorYears" INTEGER NOT NULL,
    "status" "LoanApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplicationTranslation" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "cropType" TEXT NOT NULL,
    "locationLabel" TEXT NOT NULL,

    CONSTRAINT "LoanApplicationTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanDecision" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "status" "LoanApplicationStatus" NOT NULL,
    "maxLtv" DOUBLE PRECISION NOT NULL,
    "provisioningRateAdjustment" DOUBLE PRECISION NOT NULL,
    "insuranceRequirement" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateReport" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "dataSourcesAppendix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClimateReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateAlert" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "severity" "RiskLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "exposureAmount" DOUBLE PRECISION NOT NULL,
    "affectedLoans" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClimateAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateAlertTranslation" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "ClimateAlertTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "organisation" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'EN',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Borrower" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "institutionName" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Borrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessGrant" (
    "id" TEXT NOT NULL,
    "grantedToId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "farmId" TEXT,
    "scope" "GrantScope" NOT NULL DEFAULT 'READ',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "borrowerId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "il" TEXT,
    "ilce" TEXT,
    "geojson" JSONB NOT NULL,
    "geom" geometry(MultiPolygon,4326),
    "areaM2" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "centroidLat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "centroidLng" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "geometrySource" "GeometrySource" NOT NULL DEFAULT 'USER_DRAWN',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED_DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadastralParcel" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "mahalleKoy" TEXT NOT NULL,
    "ada" INTEGER NOT NULL,
    "parsel" INTEGER NOT NULL,
    "originalInput" TEXT NOT NULL,
    "officialAreaM2" DECIMAL(16,2),
    "geojson" JSONB,
    "geom" geometry(MultiPolygon,4326),
    "areaM2" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "geometrySource" "GeometrySource" NOT NULL DEFAULT 'USER_DRAWN',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED_DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadastralParcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "isIrrigated" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "heatThresholdC" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "heatPctPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "heatCapPct" DOUBLE PRECISION NOT NULL DEFAULT 28,
    "frostThresholdC" DOUBLE PRECISION NOT NULL DEFAULT -3,
    "frostPctPerEvent" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "waterRequirementMm" DOUBLE PRECISION NOT NULL DEFAULT 320,
    "droughtMaxPct" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "waterloggingPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "irrigationPctPerDay" DOUBLE PRECISION NOT NULL DEFAULT 1.4,
    "irrigationCapPct" DOUBLE PRECISION NOT NULL DEFAULT 40,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropAssumption" (
    "id" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "yieldTPerHa" DECIMAL(10,3) NOT NULL,
    "priceTryPerT" DECIMAL(14,2) NOT NULL,
    "costTryPerHa" DECIMAL(14,2) NOT NULL,
    "source" TEXT NOT NULL,
    "isDemoAssumption" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CropAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropCalendarStage" (
    "id" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "stage" "CropStage" NOT NULL,
    "startOffsetDays" INTEGER NOT NULL,
    "endOffsetDays" INTEGER NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "isDemoAssumption" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CropCalendarStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionalCropDefault" (
    "id" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "RegionalCropDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CultivationSection" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "parcelId" TEXT,
    "ordinal" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "geojson" JSONB NOT NULL,
    "geom" geometry(MultiPolygon,4326),
    "areaM2" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "isMultipart" BOOLEAN NOT NULL DEFAULT false,
    "cropId" TEXT NOT NULL,
    "plantingDate" DATE NOT NULL,
    "harvestWindowStart" DATE NOT NULL,
    "harvestWindowEnd" DATE NOT NULL,
    "expectedSaleDate" DATE NOT NULL,
    "yieldTPerHa" DECIMAL(10,3) NOT NULL,
    "priceTryPerT" DECIMAL(14,2) NOT NULL,
    "costTryPerHa" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CultivationSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "geojson" JSONB NOT NULL,
    "geom" geometry(Geometry,4326),
    "capacityLpm" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceLink" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "sharePct" DOUBLE PRECISION NOT NULL DEFAULT 100,

    CONSTRAINT "ResourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "principal" DECIMAL(18,2) NOT NULL,
    "outstandingPrincipal" DECIMAL(18,2) NOT NULL,
    "interestRatePct" DECIMAL(9,4) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdByUserId" TEXT,
    "createdByRole" "UserRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentScheduleItem" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "RepaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowEvent" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "loanId" TEXT,
    "kind" "CashFlowKind" NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "label" TEXT NOT NULL,
    "source" "CashFlowSource" NOT NULL DEFAULT 'USER',
    "createdByUserId" TEXT,
    "createdByRole" "UserRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashFlowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eligibleHazards" TEXT[],
    "coverageLimit" DECIMAL(18,2) NOT NULL,
    "deductible" DECIMAL(18,2) NOT NULL,
    "assumedEligibility" BOOLEAN NOT NULL DEFAULT true,
    "payoutLagDays" INTEGER NOT NULL DEFAULT 45,
    "isDemoAssumption" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'User-entered demo assumption',
    "verifiedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdByRole" "UserRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherDataset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "WeatherDatasetKind" NOT NULL,
    "provenance" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "stationOrGrid" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "license" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherObservation" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tMaxC" DOUBLE PRECISION NOT NULL,
    "tMinC" DOUBLE PRECISION NOT NULL,
    "precipMm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WeatherObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ScenarioKind" NOT NULL,
    "weatherDatasetId" TEXT,
    "dateAlignment" "DateAlignment" NOT NULL DEFAULT 'ALIGN_TO_PLANTING',
    "params" JSONB NOT NULL DEFAULT '{}',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioRun" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "rulesetVersion" TEXT NOT NULL,
    "resultJson" JSONB NOT NULL,
    "financialResultJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessmentRun" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "requestedById" TEXT,
    "inputHash" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "band" "RiskLevel" NOT NULL,
    "resultJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessmentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Region_type_idx" ON "Region"("type");

-- CreateIndex
CREATE INDEX "Region_country_idx" ON "Region"("country");

-- CreateIndex
CREATE UNIQUE INDEX "RegionTranslation_regionId_locale_key" ON "RegionTranslation"("regionId", "locale");

-- CreateIndex
CREATE INDEX "ClimateSnapshot_regionId_date_idx" ON "ClimateSnapshot"("regionId", "date");

-- CreateIndex
CREATE INDEX "RiskAssessment_regionId_assessmentDate_idx" ON "RiskAssessment"("regionId", "assessmentDate");

-- CreateIndex
CREATE INDEX "RiskAssessment_riskLevel_idx" ON "RiskAssessment"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessmentTranslation_assessmentId_locale_key" ON "RiskAssessmentTranslation"("assessmentId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioTranslation_portfolioId_locale_key" ON "PortfolioTranslation"("portfolioId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioRegion_portfolioId_regionId_key" ON "PortfolioRegion"("portfolioId", "regionId");

-- CreateIndex
CREATE INDEX "LoanApplication_regionId_idx" ON "LoanApplication"("regionId");

-- CreateIndex
CREATE INDEX "LoanApplication_status_idx" ON "LoanApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LoanApplicationTranslation_loanApplicationId_locale_key" ON "LoanApplicationTranslation"("loanApplicationId", "locale");

-- CreateIndex
CREATE INDEX "LoanDecision_loanApplicationId_idx" ON "LoanDecision"("loanApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClimateReport_reportNumber_key" ON "ClimateReport"("reportNumber");

-- CreateIndex
CREATE INDEX "ClimateReport_loanApplicationId_idx" ON "ClimateReport"("loanApplicationId");

-- CreateIndex
CREATE INDEX "ClimateAlert_regionId_idx" ON "ClimateAlert"("regionId");

-- CreateIndex
CREATE INDEX "ClimateAlert_severity_idx" ON "ClimateAlert"("severity");

-- CreateIndex
CREATE INDEX "ClimateAlert_status_idx" ON "ClimateAlert"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClimateAlertTranslation_alertId_locale_key" ON "ClimateAlertTranslation"("alertId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Borrower_userId_key" ON "Borrower"("userId");

-- CreateIndex
CREATE INDEX "AccessGrant_grantedToId_idx" ON "AccessGrant"("grantedToId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessGrant_grantedToId_borrowerId_farmId_key" ON "AccessGrant"("grantedToId", "borrowerId", "farmId");

-- CreateIndex
CREATE INDEX "Farm_ownerUserId_idx" ON "Farm"("ownerUserId");

-- CreateIndex
CREATE INDEX "Farm_borrowerId_idx" ON "Farm"("borrowerId");

-- CreateIndex
CREATE INDEX "Farm_isDemo_idx" ON "Farm"("isDemo");

-- CreateIndex
CREATE INDEX "CadastralParcel_ada_parsel_idx" ON "CadastralParcel"("ada", "parsel");

-- CreateIndex
CREATE INDEX "CadastralParcel_farmId_idx" ON "CadastralParcel"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "CadastralParcel_il_ilce_mahalleKoy_ada_parsel_key" ON "CadastralParcel"("il", "ilce", "mahalleKoy", "ada", "parsel");

-- CreateIndex
CREATE INDEX "Season_farmId_idx" ON "Season"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_farmId_name_key" ON "Season"("farmId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Crop_code_key" ON "Crop"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CropAssumption_cropId_regionCode_year_key" ON "CropAssumption"("cropId", "regionCode", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CropCalendarStage_cropId_regionCode_stage_key" ON "CropCalendarStage"("cropId", "regionCode", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "RegionalCropDefault_regionCode_cropId_key" ON "RegionalCropDefault"("regionCode", "cropId");

-- CreateIndex
CREATE INDEX "CultivationSection_farmId_idx" ON "CultivationSection"("farmId");

-- CreateIndex
CREATE INDEX "CultivationSection_cropId_idx" ON "CultivationSection"("cropId");

-- CreateIndex
CREATE UNIQUE INDEX "CultivationSection_seasonId_ordinal_key" ON "CultivationSection"("seasonId", "ordinal");

-- CreateIndex
CREATE INDEX "Resource_ownerUserId_idx" ON "Resource"("ownerUserId");

-- CreateIndex
CREATE INDEX "ResourceLink_sectionId_idx" ON "ResourceLink"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceLink_resourceId_sectionId_key" ON "ResourceLink"("resourceId", "sectionId");

-- CreateIndex
CREATE INDEX "Loan_borrowerId_idx" ON "Loan"("borrowerId");

-- CreateIndex
CREATE INDEX "Loan_farmId_idx" ON "Loan"("farmId");

-- CreateIndex
CREATE INDEX "RepaymentScheduleItem_loanId_dueDate_idx" ON "RepaymentScheduleItem"("loanId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "RepaymentScheduleItem_loanId_sequence_key" ON "RepaymentScheduleItem"("loanId", "sequence");

-- CreateIndex
CREATE INDEX "CashFlowEvent_farmId_date_idx" ON "CashFlowEvent"("farmId", "date");

-- CreateIndex
CREATE INDEX "CashFlowEvent_seasonId_idx" ON "CashFlowEvent"("seasonId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_farmId_idx" ON "InsurancePolicy"("farmId");

-- CreateIndex
CREATE INDEX "WeatherObservation_datasetId_date_idx" ON "WeatherObservation"("datasetId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherObservation_datasetId_date_key" ON "WeatherObservation"("datasetId", "date");

-- CreateIndex
CREATE INDEX "Scenario_farmId_idx" ON "Scenario"("farmId");

-- CreateIndex
CREATE INDEX "ScenarioRun_scenarioId_idx" ON "ScenarioRun"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioRun_scenarioId_inputHash_providerVersion_key" ON "ScenarioRun"("scenarioId", "inputHash", "providerVersion");

-- CreateIndex
CREATE INDEX "RiskAssessmentRun_farmId_idx" ON "RiskAssessmentRun"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessmentRun_farmId_seasonId_inputHash_providerVersion_key" ON "RiskAssessmentRun"("farmId", "seasonId", "inputHash", "providerVersion");

-- AddForeignKey
ALTER TABLE "RegionTranslation" ADD CONSTRAINT "RegionTranslation_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimateSnapshot" ADD CONSTRAINT "ClimateSnapshot_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessmentTranslation" ADD CONSTRAINT "RiskAssessmentTranslation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "RiskAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioTranslation" ADD CONSTRAINT "PortfolioTranslation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioRegion" ADD CONSTRAINT "PortfolioRegion_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioRegion" ADD CONSTRAINT "PortfolioRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplicationTranslation" ADD CONSTRAINT "LoanApplicationTranslation_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanDecision" ADD CONSTRAINT "LoanDecision_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimateReport" ADD CONSTRAINT "ClimateReport_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimateAlert" ADD CONSTRAINT "ClimateAlert_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimateAlertTranslation" ADD CONSTRAINT "ClimateAlertTranslation_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "ClimateAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Borrower" ADD CONSTRAINT "Borrower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_grantedToId_fkey" FOREIGN KEY ("grantedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadastralParcel" ADD CONSTRAINT "CadastralParcel_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropAssumption" ADD CONSTRAINT "CropAssumption_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropCalendarStage" ADD CONSTRAINT "CropCalendarStage_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionalCropDefault" ADD CONSTRAINT "RegionalCropDefault_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationSection" ADD CONSTRAINT "CultivationSection_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationSection" ADD CONSTRAINT "CultivationSection_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationSection" ADD CONSTRAINT "CultivationSection_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "CadastralParcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationSection" ADD CONSTRAINT "CultivationSection_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CultivationSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentScheduleItem" ADD CONSTRAINT "RepaymentScheduleItem_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowEvent" ADD CONSTRAINT "CashFlowEvent_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowEvent" ADD CONSTRAINT "CashFlowEvent_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowEvent" ADD CONSTRAINT "CashFlowEvent_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowEvent" ADD CONSTRAINT "CashFlowEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherObservation" ADD CONSTRAINT "WeatherObservation_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "WeatherDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_weatherDatasetId_fkey" FOREIGN KEY ("weatherDatasetId") REFERENCES "WeatherDataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioRun" ADD CONSTRAINT "ScenarioRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessmentRun" ADD CONSTRAINT "RiskAssessmentRun_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessmentRun" ADD CONSTRAINT "RiskAssessmentRun_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessmentRun" ADD CONSTRAINT "RiskAssessmentRun_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
--  ClimaVex geometry integrity layer
--
--  Application code writes only `geojson`. These triggers derive the PostGIS
--  `geom` column, the spheroidal area in m², and the farm centroid, so the
--  database — not the client — is the authority on geometry and area.
-- ═══════════════════════════════════════════════════════════════════════════

-- Areal features (Farm, CadastralParcel, CultivationSection): normalise to
-- MultiPolygon, repair minor invalidity, and compute true spheroidal area.
CREATE OR REPLACE FUNCTION climavex_sync_areal_geom() RETURNS trigger AS $$
DECLARE
  parsed geometry;
BEGIN
  IF NEW."geojson" IS NULL OR NEW."geojson"::text = 'null' THEN
    NEW."geom" := NULL;
    NEW."areaM2" := 0;
    RETURN NEW;
  END IF;

  parsed := ST_SetSRID(ST_GeomFromGeoJSON(NEW."geojson"::text), 4326);

  IF NOT ST_IsValid(parsed) THEN
    -- Repair only hairline invalidity; anything worse is rejected by the
    -- application layer before it reaches here.
    parsed := ST_MakeValid(parsed);
  END IF;

  parsed := ST_Multi(ST_CollectionExtract(parsed, 3));

  IF parsed IS NULL OR ST_IsEmpty(parsed) THEN
    RAISE EXCEPTION 'climavex: geojson did not yield a usable polygonal geometry';
  END IF;

  NEW."geom"   := parsed;
  NEW."areaM2" := ROUND(ST_Area(parsed::geography)::numeric, 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_farm_geom
  BEFORE INSERT OR UPDATE OF "geojson" ON "Farm"
  FOR EACH ROW EXECUTE FUNCTION climavex_sync_areal_geom();

CREATE TRIGGER trg_parcel_geom
  BEFORE INSERT OR UPDATE OF "geojson" ON "CadastralParcel"
  FOR EACH ROW EXECUTE FUNCTION climavex_sync_areal_geom();

CREATE TRIGGER trg_section_geom
  BEFORE INSERT OR UPDATE OF "geojson" ON "CultivationSection"
  FOR EACH ROW EXECUTE FUNCTION climavex_sync_areal_geom();

-- Farm centroid, used to fly the map to a farm without loading its geometry.
CREATE OR REPLACE FUNCTION climavex_sync_farm_centroid() RETURNS trigger AS $$
BEGIN
  IF NEW."geom" IS NOT NULL THEN
    NEW."centroidLng" := ST_X(ST_PointOnSurface(NEW."geom"));
    NEW."centroidLat" := ST_Y(ST_PointOnSurface(NEW."geom"));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_farm_centroid
  BEFORE INSERT OR UPDATE OF "geojson" ON "Farm"
  FOR EACH ROW EXECUTE FUNCTION climavex_sync_farm_centroid();

-- Resources are points or lines; they have no area.
CREATE OR REPLACE FUNCTION climavex_sync_resource_geom() RETURNS trigger AS $$
BEGIN
  NEW."geom" := ST_SetSRID(ST_GeomFromGeoJSON(NEW."geojson"::text), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_resource_geom
  BEFORE INSERT OR UPDATE OF "geojson" ON "Resource"
  FOR EACH ROW EXECUTE FUNCTION climavex_sync_resource_geom();

-- Scenario runs are immutable snapshots: a result may never be rewritten.
CREATE OR REPLACE FUNCTION climavex_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'climavex: % is append-only and cannot be modified', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_scenario_run_immutable
  BEFORE UPDATE ON "ScenarioRun"
  FOR EACH ROW EXECUTE FUNCTION climavex_block_mutation();

CREATE INDEX "CadastralParcel_geom_idx"    ON "CadastralParcel"    USING GIST ("geom");
CREATE INDEX "CultivationSection_geom_idx" ON "CultivationSection" USING GIST ("geom");
CREATE INDEX "Resource_geom_idx"           ON "Resource"           USING GIST ("geom");
