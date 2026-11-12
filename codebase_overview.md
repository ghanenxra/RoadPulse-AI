# RoadPulse AI Codebase Overview

## Key Directories and Files
- **\.gitignore**: Contains rules for ignoring files and directories.
- **docker-compose.yml**: Configuration for Docker services.
- **frontend/**: Frontend directory containing various files and directories.
  - **lib/utils.ts**: Utility functions for common tasks.
  - **types/index.ts**: Key interfaces and types used throughout the frontend.
    - **RoadSegment**: Represents a road segment.
    - **WeeklyMetric**: Represents a week's worth of metrics.
    - **OverviewMetrics**: Key performance indicators and distribution data.
    - **KPIValue**: Represents a key performance indicator with current, previous, change, and change percentage.
    - **GradeDistribution**: Distribution of road grades.
    - **ProcessingStatus**: Status of processing jobs.
    - **AccountabilitySnapshot**: Snapshots of reported, acknowledged, in-progress, claimed repaired, verified, failed verification, and overdue issues.
    - **ProcessingJob**: Details of a processing job.
    - **IssueReport**: Represents an issue report.
    - **Detection**: Represents a detection.
    - **MapFeature**: Represents a map feature.
    - **WeeklyTrend**: Represents a week's trend data.
    - **VehicleTelemetry**: Represents vehicle telemetry data.
- **frontend/lib/constants.ts**: Contains GRADE_CONFIG and STATUS_CONFIG constants used in utility functions.

## Utility Functions in `frontend/lib/utils.ts`

1. **cn(...inputs: ClassValue[]): string**:
   - Combines class values using `clsx` and `twMerge` from `tailwind-merge`.
2. **formatNumber(num: number): string**:
   - Formats a number using `Intl.NumberFormat` to format the number according to the US locale.
3. **formatPercent(num: number): string**:
   - Formats a number as a percentage, optionally prefixing with a plus sign if the number is positive.
4. **getGradeColor(grade: string): string**:
   - Returns the color associated with a grade from the `GRADE_CONFIG` constant.
5. **getGradeLabel(grade: string): string**:
   - Returns the label associated with a grade from the `GRADE_CONFIG` constant.
6. **getStatusColor(status: string): string**:
   - Returns the color associated with a status from the `STATUS_CONFIG` constant.
7. **formatDate(dateString: string): string**:
   - Formats a date string into a readable date format.
8. **generateNarrative(weeks: WeeklyMetric[]): string**:
   - Generates a narrative based on the weekly metrics, indicating changes in road conditions and status.

## Constants in `frontend/lib/constants.ts`

- **GRADE_CONFIG**:
  - Configuration for road grades with their respective colors and labels.
- **STATUS_CONFIG**:
  - Configuration for road statuses with their respective colors and labels.

---

This document provides a high-level overview of the codebase structure and key utility functions and constants used in the frontend.