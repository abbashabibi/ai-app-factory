import { PROJECT_STAGES } from './project-service.mjs';

const STAGE_TASKS = {
  IDEA: 'تحلیل ایده، استخراج هدف، کاربران و محدودیت‌ها',
  RESEARCHED: 'تحقیق نیازمندی‌ها، ریسک‌ها و الزامات فنی',
  SCRIPTED: 'طراحی معماری، جریان‌ها و قراردادهای فنی',
  ASSETS_READY: 'تولید مشخصات UI/UX و فهرست دارایی‌ها',
  RENDERED: 'تولید کد و آماده‌سازی پروژه برای Build',
  QA_PASSED: 'اجرای تست‌ها، کنترل کیفیت و رفع خطاها',
  UPLOADED: 'Build ابری و دریافت artifact/APK',
  ANALYZED: 'تحویل، ثبت نتیجه و تحلیل خروجی',
};

export function getNextStage(stage) {
  const index = PROJECT_STAGES.indexOf(stage);
  if (index < 0) throw new Error('INVALID_STAGE');
  return PROJECT_STAGES[index + 1] ?? null;
}

export function createExecutionPlan(project) {
  if (!project?.projectId) throw new Error('INVALID_PROJECT');
  const currentIndex = PROJECT_STAGES.indexOf(project.stage);
  if (currentIndex < 0) throw new Error('INVALID_STAGE');
  const nextStage = getNextStage(project.stage);
  return {
    projectId: project.projectId,
    status: nextStage ? 'READY' : 'COMPLETED',
    currentStage: project.stage,
    nextStage,
    task: STAGE_TASKS[nextStage || project.stage],
    requiresProvider: Boolean(nextStage && ['RENDERED', 'UPLOADED'].includes(nextStage)),
    stages: PROJECT_STAGES.map((stage, index) => ({
      stage,
      status: index < currentIndex ? 'DONE' : index === currentIndex ? 'ACTIVE' : 'WAITING',
      task: STAGE_TASKS[stage],
    })),
  };
}

export function assertStageCompletion(project, completedStage) {
  if (!project?.projectId) throw new Error('INVALID_PROJECT');
  if (project.stage !== completedStage) throw new Error('ORCHESTRATOR_STAGE_MISMATCH');
  return {
    projectId: project.projectId,
    completedStage,
    nextStage: getNextStage(completedStage),
    task: STAGE_TASKS[getNextStage(completedStage) || completedStage],
  };
}
