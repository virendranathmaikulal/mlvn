export type YCloudCategory = 'MARKETING' | 'UTILITY';
export type YCloudComponentType = 'BODY' | 'HEADER' | 'BUTTONS' | 'FOOTER';
export type YCloudMediaFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
export type YCloudTemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export interface YCloudButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface YCloudComponent {
  type: YCloudComponentType;
  text?: string;
  format?: YCloudMediaFormat;
  buttons?: YCloudButton[];
}

export interface YCloudTemplate {
  name: string;
  language: string;
  category: YCloudCategory;
  status: YCloudTemplateStatus;
  components: YCloudComponent[];
}

export interface CreateTemplateParams {
  name: string;
  language: string;
  category: YCloudCategory;
  components: YCloudComponent[];
}

export interface WhatsAppTemplate {
  id: string;
  user_id: string;
  name: string;
  template_content: string;
  media_url: string | null;
  category: string;
  status: string;
  language: string;
  ycloud_status?: YCloudTemplateStatus;
  ycloud_name?: string;
  components?: YCloudComponent[];
  last_synced_at?: string;
  created_at: string;
}
