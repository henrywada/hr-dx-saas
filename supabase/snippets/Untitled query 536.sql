-- 1. 施工会社（納入先）マスタ
CREATE TABLE myou_companies (
    company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    email_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 製品（スプレー缶）マスタ
-- QRコードから読み取る「シリアル番号」と「有効期限」を管理します [cite: 25]
CREATE TABLE myou_products (
    serial_number TEXT PRIMARY KEY, -- QRコードに含まれる一意の番号 [cite: 25]
    expiration_date DATE NOT NULL,  -- QRコードに含まれる有効期間 [cite: 25]
    product_name TEXT DEFAULT 'セルフィールMS', -- 製品名 [cite: 7, 41]
    status TEXT DEFAULT 'shipped',  -- 状態管理（shipped, consumed, expired等）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 納入履歴（トレーサビリティの核）
-- 「どの製品を」「どの施工会社に」「いつ納入したか」を記録します [cite: 27]
CREATE TABLE myou_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number TEXT REFERENCES myou_products(serial_number),
    company_id UUID REFERENCES myou_companies(company_id),
    delivery_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 納入日 [cite: 27]
    scanned_by UUID, -- Supabase AuthのユーザーID（誰がスキャンしたか）
    
    -- 同一製品の重複納入を防ぐ制約
    CONSTRAINT unique_product_delivery UNIQUE (serial_number)
);

-- 4. アラート送信履歴
-- 有効期限が近い製品の注意喚起メール送信記録 [cite: 29]
CREATE TABLE myou_alert_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES myou_companies(company_id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    target_serials TEXT[] -- 送信対象となったシリアル番号のリスト
);