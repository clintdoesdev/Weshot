import type { RecordJobData } from '@weshot/server';
import type { Job } from 'bullmq';
import type { CaptureDeps } from '../capture';

/** Implemented in phase 5. */
export async function runRecordJob(job: Job<RecordJobData>, deps: CaptureDeps = {}): Promise<void> {
  void job;
  void deps;
}
