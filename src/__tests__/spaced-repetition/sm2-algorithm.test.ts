/**
 * SM-2 Algorithm Tests
 * REQ-SR-001
 * 
 * Validates SM-2 spaced repetition algorithm compliance
 */

import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '@/utils/sm2';

describe('REQ-SR-001: SM-2 Algorithm Compliance', () => {
  it('quality < 3 (failure) resets interval to 1 day', () => {
    const result = calculateSM2({
      quality: 2, // Failure
      easeFactor: 2.5,
      intervalDays: 10,
      repetitions: 5,
    });
    
    expect(result.nextInterval).toBe(1);
    expect(result.nextRepetitions).toBe(0);
  });

  it('quality >= 3 increases interval based on ease factor', () => {
    const result = calculateSM2({
      quality: 4, // Good performance
      easeFactor: 2.5,
      intervalDays: 3,
      repetitions: 2,
    });
    
    expect(result.nextInterval).toBeGreaterThan(3);
    expect(result.nextRepetitions).toBe(3);
  });

  it('first review (repetitions = 0) sets interval to 1 day', () => {
    const result = calculateSM2({
      quality: 3,
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
    });
    
    expect(result.nextInterval).toBe(1);
    expect(result.nextRepetitions).toBe(1);
  });

  it('second review (repetitions = 1) sets interval to 3 days', () => {
    const result = calculateSM2({
      quality: 4,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 1,
    });
    
    expect(result.nextInterval).toBe(3);
    expect(result.nextRepetitions).toBe(2);
  });

  it('ease factor decreases on poor performance', () => {
    const initialEase = 2.5;
    const result = calculateSM2({
      quality: 3, // OK performance
      easeFactor: initialEase,
      intervalDays: 5,
      repetitions: 3,
    });
    
    // Ease factor should decrease slightly for quality 3
    expect(result.nextEaseFactor).toBeLessThan(initialEase);
    expect(result.nextEaseFactor).toBeGreaterThanOrEqual(1.3); // Minimum bound
  });

  it('ease factor increases on excellent performance', () => {
    const initialEase = 2.5;
    const result = calculateSM2({
      quality: 5, // Perfect
      easeFactor: initialEase,
      intervalDays: 5,
      repetitions: 3,
    });
    
    expect(result.nextEaseFactor).toBeGreaterThan(initialEase);
  });

  it('nextReviewDate is calculated correctly', () => {
    const now = new Date();
    const result = calculateSM2({
      quality: 4,
      easeFactor: 2.5,
      intervalDays: 3,
      repetitions: 2,
    });
    
    const reviewDate = new Date(result.nextReviewDate);
    const expectedDate = new Date(now);
    expectedDate.setDate(expectedDate.getDate() + result.nextInterval);
    
    // Allow 1 second tolerance for execution time
    const diff = Math.abs(reviewDate.getTime() - expectedDate.getTime());
    expect(diff).toBeLessThan(1000);
  });
});

