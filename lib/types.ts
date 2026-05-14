export interface ExperienceItem {
  id: string;
  companyName: string;
  role: string;
  period: string;
  companyLogo?: string;
  description: string;
}

export interface ProfileData {
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  bio: string;
  profileImage?: string;
  keywords: string[];
  experience: ExperienceItem[];
}

export const INITIAL_DATA: ProfileData = {
  name: '김지연',
  jobTitle: 'CJ ONE 광고사업 기획/영업/전략 (8년차)',
  email: 'wrjjy94@gmail.com',
  phone: '010-9903-9882',
  bio: "플랫폼 광고 8년 경력을 보유하고 있으며, CJ그룹의 통합 멤버십 'CJ ONE'에서 광고사업 (기획/영업/전략)을 담당하고 있습니다. 신규 상품 런칭, 플랫폼 광고 고도화, B2B 세일즈까지 광고 비즈니스 전반적인 사이클을 주도적으로 수행해왔습니다. 특히 세일즈 관점에서 광고 매체로서의 성장 구조를 설계하는 데 강점이 있습니다.",
  keywords: ['CJ ONE', '플랫폼광고', '광고사업기획', 'B2B세일즈', '매체수익화', '데이터마케팅'],
  experience: [
    {
      id: '1',
      companyName: 'CJ 올리브네트웍스 (CJ ONE)',
      role: '광고사업 기획/전략/영업',
      period: '2017.01 ~ 현재',
      description: '- 회원 3,200만 명의 대규모 트래픽 및 데이터 기반 광고 수익 구조 설계\n- 신규 광고 상품 런칭 및 광고주 맞춤형 비즈니스 솔루션 수립\n- 온/오프라인 통합 멤버십 데이터를 활용한 정교한 타겟팅 광고 비즈니스 리딩',
    }
  ],
};
