// 📁 frontend/src/utils/api-client.ts
// Create at 2504232222 Ver5.0

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// 환경 변수에서 API 기본 URL 가져오기 - 하드코딩된 기본값 없이 환경변수만 사용
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * 환경에 따라 올바른 API 경로를 생성하는 함수
 * - 로컬 환경: /api/path
 * - 클라우드 함수 환경: /api/path (항상 /api 접두사 포함)
 */
export const getApiPath = (path: string): string => {
  // 경로가 이미 /로 시작하는지 확인
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // API 접두사 확인 - 모든 환경에서 /api 접두사 유지
  if (normalizedPath.startsWith('/api/')) {
    return normalizedPath; // 이미 /api/로 시작하면 그대로 유지
  }
  
  // API 접두사 추가 - 항상 /api/ 접두사 사용
  return `/api${normalizedPath}`;
};

/**
 * API 요청을 처리하는 클라이언트
 * 환경에 따라 적절한 기본 URL 사용
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30초 타임아웃
});

// 요청 인터셉터 설정
apiClient.interceptors.request.use(
  (config) => {
    // Firebase Auth 토큰이 있으면 헤더에 추가
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 환경에 따라 URL 경로 조정
    if (config.url) {
      // URL이 외부 도메인인 경우 처리하지 않음
      if (!config.url.startsWith('http')) {
        config.url = getApiPath(config.url);
        console.log('최종 요청 URL:', config.url);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 에러 처리 로직
    if (error.response) {
      // 서버에서 응답이 왔지만 에러 코드인 경우
      console.error('API Error:', error.response.data);
      
      // 401 Unauthorized 에러 처리 (토큰 만료 등)
      if (error.response.status === 401) {
        // 로그아웃 처리 또는 토큰 갱신 로직
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // 요청은 보냈지만 응답이 없는 경우
      console.error('API Request Error:', error.request);
    } else {
      // 요청 설정 중 에러가 발생한 경우
      console.error('API Config Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * API 요청 함수들
 */
export const api = {
  /**
   * GET 요청
   * @param url - API 엔드포인트
   * @param config - Axios 설정
   */
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.get<T>(url, config);
  },
  
  /**
   * POST 요청
   * @param url - API 엔드포인트
   * @param data - 요청 본문 데이터
   * @param config - Axios 설정
   */
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.post<T>(url, data, config);
  },
  
  /**
   * PUT 요청
   * @param url - API 엔드포인트
   * @param data - 요청 본문 데이터
   * @param config - Axios 설정
   */
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.put<T>(url, data, config);
  },
  
  /**
   * DELETE 요청
   * @param url - API 엔드포인트
   * @param config - Axios 설정
   */
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.delete<T>(url, config);
  },
  
  /**
   * PATCH 요청
   * @param url - API 엔드포인트
   * @param data - 요청 본문 데이터
   * @param config - Axios 설정
   */
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.patch<T>(url, data, config);
  },
};

export default api;