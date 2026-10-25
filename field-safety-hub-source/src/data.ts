export const layout = [
  { x: 0.019, y: 0.383, w: 0.05, h: 0.243 },
  { x: 0.072, y: 0.383, w: 0.087, h: 0.243 },
  { x: 0.1639, y: 0.383, w: 0.103, h: 0.243 },
  { x: 0.27, y: 0.383, w: 0.072, h: 0.243 },
  { x: 0.346, y: 0.383, w: 0.045, h: 0.243 },
  { x: 0.019, y: 0.633, w: 0.151, h: 0.0755 },
  { x: 0.17, y: 0.633, w: 0.113, h: 0.0755 },
  { x: 0.283, y: 0.633, w: 0.113, h: 0.0755 },
  { x: 0.019, y: 0.715, w: 0.05, h: 0.243 },
  { x: 0.072, y: 0.715, w: 0.046, h: 0.243 },
  { x: 0.123, y: 0.715, w: 0.046, h: 0.243 },
  { x: 0.173, y: 0.715, w: 0.052, h: 0.243 },
  { x: 0.2275, y: 0.715, w: 0.0525, h: 0.243 },
  { x: 0.284, y: 0.715, w: 0.052, h: 0.243 },
  { x: 0.3403, y: 0.715, w: 0.055, h: 0.243 },
  { x: 0.397, y: 0.383, w: 0.105, h: 0.4 },
  { x: 0.505, y: 0.383, w: 0.047, h: 0.243 },
  { x: 0.554, y: 0.383, w: 0.065, h: 0.243 },
  { x: 0.622, y: 0.383, w: 0.101, h: 0.243 },
  { x: 0.728, y: 0.383, w: 0.066, h: 0.243 },
  { x: 0.795, y: 0.383, w: 0.045, h: 0.243 },
  { x: 0.503, y: 0.633, w: 0.155, h: 0.0755 },
  { x: 0.659, y: 0.633, w: 0.185, h: 0.0755 },
  { x: 0.505, y: 0.715, w: 0.068, h: 0.243 },
  { x: 0.577, y: 0.715, w: 0.08, h: 0.243 },
  { x: 0.661, y: 0.715, w: 0.065, h: 0.243 },
  { x: 0.73, y: 0.715, w: 0.108, h: 0.243 },
  { x: 0.842, y: 0.715, w: 0.15, h: 0.243 },
  { x: 0.845, y: 0.383, w: 0.036, h: 0.33 },
  { x: 0.885, y: 0.485, w: 0.107, h: 0.226 },
  { x: 0.885, y: 0.254, w: 0.107, h: 0.226 },
  { x: 0.885, y: 0.02, w: 0.107, h: 0.2275 },
  { x: 0.845, y: 0.02, w: 0.036, h: 0.363 },
  { x: 0.727, y: 0.02, w: 0.115, h: 0.357 },
];
export const floors = ["1F", "2F", "3F", "4F", "5F", "6F"];
export const prefixes = ["A", "B", "C", "D", "E", "G"];
export const hazards = [
  "단차",
  "미끄러짐",
  "정리불량",
  "통로막힘",
  "추락낙하",
  "조도불량",
  "전도넘어짐",
  "기타",
];
export const statuses = ["접수", "확인", "조치중", "완료"];
export const sites = [
  {
    id: "training",
    name: "안전관리 실습 현장",
    location: "기존 34구역 평면도 · 샘플 데이터",
  },
  {
    id: "project",
    name: "나의 프로젝트 현장",
    location: "새 신고부터 시작하는 개발 공간",
  },
];
export type Report = {
  id: string;
  siteId: string;
  workerName: string;
  floor: string;
  sector: string;
  hazard: string;
  detail: string;
  priority: string;
  status: string;
  assignee: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  photos: string[];
  resolutionPhotos: string[];
  resolutionNote: string;
  sample: number;
  locationSource: string;
  x: number | null;
  y: number | null;
  history: {
    id: string;
    status: string;
    note: string;
    actor: string;
    createdAt: string;
  }[];
};
