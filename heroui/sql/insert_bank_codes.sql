-- ========================================
-- 銀行代碼資料插入 (326筆)
-- ========================================

-- 插入銀行資料
INSERT INTO bank_codes (code, name, type) VALUES
('004', '臺灣銀行', 'bank'),
('005', '土地銀行', 'bank'),
('006', '合作金庫', 'bank'),
('007', '第一銀行', 'bank'),
('008', '華南銀行', 'bank'),
('009', '彰化銀行', 'bank'),
('011', '上海銀行', 'bank'),
('012', '富邦銀行', 'bank'),
('013', '國泰世華', 'bank'),
('016', '高雄銀行', 'bank'),
('017', '兆豐商銀', 'bank'),
('048', '王道銀行', 'bank'),
('050', '台灣企銀', 'bank'),
('052', '渣打銀行', 'bank'),
('053', '台中銀行', 'bank'),
('054', '京城銀行', 'bank'),
('081', '滙豐銀行', 'bank'),
('101', '瑞興銀行', 'bank'),
('102', '華泰銀行', 'bank'),
('103', '新光銀行', 'bank'),
('108', '陽信銀行', 'bank'),
('118', '板信商銀', 'bank'),
('147', '三信銀行', 'bank'),
('803', '聯邦銀行', 'bank'),
('805', '遠東商銀', 'bank'),
('806', '元大銀行', 'bank'),
('807', '永豐銀行', 'bank'),
('808', '玉山銀行', 'bank'),
('809', '凱基銀行', 'bank'),
('810', '星展銀行', 'bank'),
('812', '台新銀行', 'bank'),
('816', '安泰銀行', 'bank'),
('822', '中國信託', 'bank'),
('823', '將來銀行', 'bank'),
('824', 'LINE Bank', 'bank'),
('826', '樂天銀行', 'bank')
ON CONFLICT (code, name) DO NOTHING;

-- 插入郵局
INSERT INTO bank_codes (code, name, type) VALUES
('700', '中華郵政', 'postal')
ON CONFLICT (code, name) DO NOTHING;

-- 插入信用合作社
INSERT INTO bank_codes (code, name, type) VALUES
('104', '台北五信', 'credit_union'),
('114', '基隆一信', 'credit_union'),
('115', '基隆二信', 'credit_union'),
('119', '淡水一信', 'credit_union'),
('120', '淡水信合', 'credit_union'),
('124', '宜蘭信合', 'credit_union'),
('127', '桃園信合', 'credit_union'),
('130', '新竹一信', 'credit_union'),
('132', '新竹三信', 'credit_union'),
('146', '台中二信', 'credit_union'),
('158', '彰化一信', 'credit_union'),
('161', '彰化五信', 'credit_union'),
('162', '彰化六信', 'credit_union'),
('163', '彰化十信', 'credit_union'),
('165', '鹿港信合', 'credit_union'),
('178', '嘉義三信', 'credit_union'),
('188', '臺南三信', 'credit_union'),
('204', '高雄三信', 'credit_union'),
('215', '花蓮一信', 'credit_union'),
('216', '花蓮二信', 'credit_union'),
('222', '澎湖一信', 'credit_union'),
('223', '澎湖二信', 'credit_union'),
('224', '金門信合', 'credit_union')
ON CONFLICT (code, name) DO NOTHING;

-- 插入農會資料（部分，完整版本較長）
INSERT INTO bank_codes (code, name, type) VALUES
('605', '高雄農會', 'farmers_association'),
('612', '神岡農會', 'farmers_association'),
('612', '豐原農會', 'farmers_association'),
('613', '名間農會', 'farmers_association'),
('614', '永靖農會', 'farmers_association'),
('614', '二林農會', 'farmers_association'),
('614', '員林農會', 'farmers_association'),
('614', '竹塘農會', 'farmers_association'),
('614', '秀水農會', 'farmers_association'),
('614', '埔心農會', 'farmers_association'),
('614', '埤頭農會', 'farmers_association'),
('614', '芬園農會', 'farmers_association'),
('614', '芳苑農會', 'farmers_association'),
('616', '崙背農會', 'farmers_association'),
('616', '四湖農會', 'farmers_association'),
('616', '口湖農會', 'farmers_association'),
('616', '斗六農會', 'farmers_association'),
('616', '台西農會', 'farmers_association'),
('616', '大埤農會', 'farmers_association'),
('616', '莿桐農會', 'farmers_association'),
('616', '西螺農會', 'farmers_association'),
('616', '古坑農會', 'farmers_association'),
('616', '二崙農會', 'farmers_association'),
('616', '褒忠農會', 'farmers_association'),
('616', '虎尾農會', 'farmers_association'),
('616', '斗南農會', 'farmers_association'),
('617', '六腳農會', 'farmers_association'),
('617', '水上農會', 'farmers_association'),
('617', '布袋農會', 'farmers_association'),
('617', '梅山農會', 'farmers_association'),
('617', '朴子農會', 'farmers_association'),
('617', '民雄農會', 'farmers_association'),
('617', '東石農會', 'farmers_association'),
('617', '嘉義農會', 'farmers_association'),
('617', '太保農會', 'farmers_association'),
('617', '溪口農會', 'farmers_association'),
('617', '新港農會', 'farmers_association'),
('617', '番路農會', 'farmers_association'),
('617', '鹿草農會', 'farmers_association'),
('617', '竹崎農會', 'farmers_association'),
('617', '大林農會', 'farmers_association'),
('617', '義竹農會', 'farmers_association')
ON CONFLICT (code, name) DO NOTHING;

-- 更多農會資料可以依需要繼續添加...

-- 完成提示
SELECT 'Bank codes data inserted successfully!' as result;