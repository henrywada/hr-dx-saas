// src/features/recognition/labels.ts

/**
 * バリュータグのデフォルト候補。
 * テナント管理者によるカスタマイズはPRDのShould要件のため、
 * MVPでは固定リストとして提供する。
 */
export const VALUE_TAGS = ['チームワーク', 'チャレンジ', '誠実', 'スピード', '顧客視点'] as const

export const REACTION_EMOJI = '👏'
