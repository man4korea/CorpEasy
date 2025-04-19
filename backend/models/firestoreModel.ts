// 📁 backend/models/firestoreModel.ts
// Create at 2504191105

import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Firebase 초기화가 되어 있지 않은 경우에만 초기화
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    logger.info('Firebase 초기화 성공');
  } catch (error) {
    logger.error('Firebase 초기화 실패:', error);
  }
}

// Firestore 인스턴스 생성
const db = admin.firestore();

// 콘텐츠 분석 결과 컬렉션
const contentAnalysisCollection = db.collection('content_analysis');

// 블로그 아티클 컬렉션
const blogArticlesCollection = db.collection('blog_articles');

// 트렌드 인사이트 컬렉션
const trendInsightsCollection = db.collection('trend_insights');

// 콘텐츠 분석 타입 정의
export interface ContentAnalysis {
  url: string;
  type: 'youtube' | 'url' | 'keyword' | 'file';
  source_title: string;
  source_category: string;
  h1_h4_summary: string; // HTML 포함
  keywords: string[];
  tags: string[];
  createdAt: admin.firestore.Timestamp;
  summaryOnly: boolean; // 상세분석까지 갔는지 여부
  blogGenerated: boolean; // SEO 주제로 블로그까지 갔는지 여부
  wasTranslated?: boolean; // 번역 여부 (선택적 필드)
  originalLanguage?: string; // 원본 언어 (선택적 필드)
}

// 블로그 아티클 타입 정의
export interface BlogArticle {
  ref_analysis_id: string; // content_analysis 문서 ID 참조
  title: string;
  html_content: string;
  createdAt: admin.firestore.Timestamp;
  status: 'draft' | 'published';
  isVisible: boolean;
}

// 트렌드 인사이트 타입 정의
export interface TrendInsight {
  related_keywords: string[];
  insight_title: string;
  summary: string;
  createdAt: admin.firestore.Timestamp;
  linkedBlogIds: string[];
}

// 콘텐츠 분석 결과 저장
export const saveContentAnalysis = async (data: Omit<ContentAnalysis, 'createdAt'>): Promise<string> => {
  try {
    const docRef = await contentAnalysisCollection.add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`콘텐츠 분석 결과 저장 성공: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    logger.error('콘텐츠 분석 결과 저장 실패:', error);
    throw error;
  }
};

// URL로 기존 콘텐츠 분석 결과 조회
export const getContentAnalysisByUrl = async (url: string): Promise<{ id: string; data: ContentAnalysis } | null> => {
  try {
    const snapshot = await contentAnalysisCollection.where('url', '==', url).limit(1).get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      data: doc.data() as ContentAnalysis,
    };
  } catch (error) {
    logger.error('URL로 콘텐츠 분석 결과 조회 실패:', error);
    throw error;
  }
};

// 콘텐츠 분석 결과 업데이트
export const updateContentAnalysis = async (id: string, data: Partial<ContentAnalysis>): Promise<void> => {
  try {
    await contentAnalysisCollection.doc(id).update({
      ...data,
      // 업데이트 시간은 변경하지 않음
    });
    logger.info(`콘텐츠 분석 결과 업데이트 성공: ${id}`);
  } catch (error) {
    logger.error(`콘텐츠 분석 결과 업데이트 실패: ${id}`, error);
    throw error;
  }
};

// 블로그 아티클 저장
export const saveBlogArticle = async (data: Omit<BlogArticle, 'createdAt'>): Promise<string> => {
  try {
    const docRef = await blogArticlesCollection.add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`블로그 아티클 저장 성공: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    logger.error('블로그 아티클 저장 실패:', error);
    throw error;
  }
};

// 트렌드 인사이트 저장
export const saveTrendInsight = async (data: Omit<TrendInsight, 'createdAt'>): Promise<string> => {
  try {
    const docRef = await trendInsightsCollection.add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`트렌드 인사이트 저장 성공: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    logger.error('트렌드 인사이트 저장 실패:', error);
    throw error;
  }
};

// 키워드 관련 트렌드 인사이트 조회
export const getTrendInsightsByKeywords = async (keywords: string[]): Promise<{ id: string; data: TrendInsight }[]> => {
  try {
    // 키워드가 하나라도 일치하는 트렌드 인사이트 조회
    const snapshot = await trendInsightsCollection
      .where('related_keywords', 'array-contains-any', keywords)
      .limit(5)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data() as TrendInsight,
    }));
  } catch (error) {
    logger.error('키워드 관련 트렌드 인사이트 조회 실패:', error);
    throw error;
  }
};

// 키워드 관련 블로그 아티클 조회
export const getBlogArticlesByKeywords = async (analysisIds: string[]): Promise<{ id: string; data: BlogArticle }[]> => {
  try {
    if (analysisIds.length === 0) {
      return [];
    }
    
    // 분석 ID 관련 블로그 아티클 조회
    const snapshot = await blogArticlesCollection
      .where('ref_analysis_id', 'in', analysisIds)
      .where('isVisible', '==', true)
      .limit(5)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data() as BlogArticle,
    }));
  } catch (error) {
    logger.error('키워드 관련 블로그 아티클 조회 실패:', error);
    throw error;
  }
};

// ID로 콘텐츠 분석 결과 조회
export const getContentAnalysisById = async (id: string): Promise<ContentAnalysis | null> => {
  try {
    const doc = await contentAnalysisCollection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as ContentAnalysis;
  } catch (error) {
    logger.error(`ID로 콘텐츠 분석 결과 조회 실패: ${id}`, error);
    throw error;
  }
};

// 모든 콘텐츠 분석 결과 조회 (페이지네이션)
export const getAllContentAnalysis = async (
  limit = 10, 
  lastVisible?: admin.firestore.QueryDocumentSnapshot
): Promise<{
  items: { id: string; data: ContentAnalysis }[],
  lastVisible?: admin.firestore.QueryDocumentSnapshot
}> => {
  try {
    let query = contentAnalysisCollection
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (lastVisible) {
      query = query.startAfter(lastVisible);
    }
    
    const snapshot = await query.get();
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data() as ContentAnalysis,
    }));
    
    return {
      items,
      lastVisible: snapshot.docs[snapshot.docs.length - 1],
    };
  } catch (error) {
    logger.error('모든 콘텐츠 분석 결과 조회 실패:', error);
    throw error;
  }
};

// 카테고리별 콘텐츠 분석 결과 조회
export const getContentAnalysisByCategory = async (
  category: string,
  limit = 10,
  lastVisible?: admin.firestore.QueryDocumentSnapshot
): Promise<{
  items: { id: string; data: ContentAnalysis }[],
  lastVisible?: admin.firestore.QueryDocumentSnapshot
}> => {
  try {
    let query = contentAnalysisCollection
      .where('source_category', '==', category)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (lastVisible) {
      query = query.startAfter(lastVisible);
    }
    
    const snapshot = await query.get();
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data() as ContentAnalysis,
    }));
    
    return {
      items,
      lastVisible: snapshot.docs[snapshot.docs.length - 1],
    };
  } catch (error) {
    logger.error(`카테고리별 콘텐츠 분석 결과 조회 실패: ${category}`, error);
    throw error;
  }
};

// 게시된 블로그 아티클 조회 (페이지네이션)
export const getPublishedBlogArticles = async (
  limit = 10,
  lastVisible?: admin.firestore.QueryDocumentSnapshot
): Promise<{
  items: { id: string; data: BlogArticle }[],
  lastVisible?: admin.firestore.QueryDocumentSnapshot
}> => {
  try {
    let query = blogArticlesCollection
      .where('status', '==', 'published')
      .where('isVisible', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (lastVisible) {
      query = query.startAfter(lastVisible);
    }
    
    const snapshot = await query.get();
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data() as BlogArticle,
    }));
    
    return {
      items,
      lastVisible: snapshot.docs[snapshot.docs.length - 1],
    };
  } catch (error) {
    logger.error('게시된 블로그 아티클 조회 실패:', error);
    throw error;
  }
};

export default {
  db,
  contentAnalysisCollection,
  blogArticlesCollection,
  trendInsightsCollection,
  saveContentAnalysis,
  getContentAnalysisByUrl,
  updateContentAnalysis,
  saveBlogArticle,
  saveTrendInsight,
  getTrendInsightsByKeywords,
  getBlogArticlesByKeywords,
  getContentAnalysisById,
  getAllContentAnalysis,
  getContentAnalysisByCategory,
  getPublishedBlogArticles,
};