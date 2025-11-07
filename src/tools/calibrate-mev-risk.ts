/**
 * MEV Risk Model Calibration Tool
 * Adapted from AxionCitadel's src/tools/calibrate-mev-risk.ts
 * 
 * Analyzes historical MEV prediction accuracy and suggests parameter adjustments
 */

import * as fs from 'fs';
import csv from 'csv-parser';

interface LogEntry {
  predicted_mev_risk_eth: number;
  actual_mev_leakage_eth: number;
  congestion_score: number;
  pool_type: string;
}

interface CalibrationReport {
  calibrated_at: string;
  total_samples: number;
  avg_bias: number;
  mae: number;
  rmse: number;
  suggested_base_risk?: number;
  suggested_alpha?: number;
}

/**
 * Main calibration function
 */
export async function calibrateMEVRisk(
  logFilePath: string = 'logs/strategy-decisions.csv',
  outputPath: string = 'mev-risk-calibration.json'
): Promise<CalibrationReport> {
  const records: LogEntry[] = [];

  // Read CSV file
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(logFilePath)
      .pipe(csv())
      .on('data', (row: any) => {
        const parsed: LogEntry = {
          predicted_mev_risk_eth: parseFloat(row.predicted_mev_risk_eth || '0'),
          actual_mev_leakage_eth: parseFloat(row.actual_mev_leakage_eth || '0'),
          congestion_score: parseFloat(row.congestion_score || '0'),
          pool_type: row.pool_type || 'unknown',
        };
        records.push(parsed);
      })
      .on('end', () => resolve())
      .on('error', (error) => reject(error));
  });

  // Calculate statistics
  let total = 0;
  let absErr = 0;
  let squaredErr = 0;
  let bias = 0;

  for (const r of records) {
    const err = r.predicted_mev_risk_eth - r.actual_mev_leakage_eth;
    total++;
    bias += err;
    absErr += Math.abs(err);
    squaredErr += err ** 2;
  }

  if (total === 0) {
    throw new Error('No data found in log file');
  }

  const meanBias = bias / total;
  const mae = absErr / total;
  const rmse = Math.sqrt(squaredErr / total);

  console.log('📊 MEV Risk Model Calibration');
  console.log('Total Samples:', total);
  console.log('Avg Bias:', meanBias.toFixed(6), '(+ means overestimated)');
  console.log('MAE:', mae.toFixed(6));
  console.log('RMSE:', rmse.toFixed(6));

  // Calculate suggested parameter adjustments based on bias
  // If bias > 0, we're overestimating, so decrease baseRisk
  // If bias < 0, we're underestimating, so increase baseRisk
  const currentBaseRisk = 0.001; // Default from MEVRiskModel
  const currentAlpha = 0.15; // Default valueSensitivity
  
  // Adjust baseRisk proportionally to bias (with dampening factor)
  const suggestedBaseRisk = Math.max(0.0001, currentBaseRisk * (1 - meanBias * 10));
  
  // Adjust alpha based on MAE (if error is high, increase sensitivity)
  const suggestedAlpha = Math.max(0.1, Math.min(0.9, currentAlpha * (1 + mae)));

  // Create calibration report
  const report: CalibrationReport = {
    calibrated_at: new Date().toISOString(),
    total_samples: total,
    avg_bias: parseFloat(meanBias.toFixed(6)),
    mae: parseFloat(mae.toFixed(6)),
    rmse: parseFloat(rmse.toFixed(6)),
    suggested_base_risk: parseFloat(suggestedBaseRisk.toFixed(6)),
    suggested_alpha: parseFloat(suggestedAlpha.toFixed(6)),
  };

  // Write calibration report to JSON file
  try {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`📄 Calibration report saved to ${outputPath}`);
  } catch (error) {
    console.error('Error writing calibration report:', error);
    throw error;
  }

  // Suggest parameter adjustments
  if (meanBias > 0.003) {
    console.log('🧠 Suggestion: decrease baseRisk or alpha slightly.');
  } else if (meanBias < -0.003) {
    console.log('🧠 Suggestion: increase baseRisk or exposureFactor.');
  } else {
    console.log('✅ Risk model is well-calibrated.');
  }

  return report;
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const logPath = process.argv[2] || 'logs/strategy-decisions.csv';
  const outputPath = process.argv[3] || 'mev-risk-calibration.json';

  calibrateMEVRisk(logPath, outputPath)
    .then(() => {
      console.log('\nCalibration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Calibration failed:', error);
      process.exit(1);
    });
}
