-- 步驟 3: 創建 RLS 政策

-- bank_codes 政策
CREATE POLICY "允許所有讀取操作" ON bank_codes FOR SELECT USING (true);

-- disaster_applications 政策
CREATE POLICY "允許所有讀取操作" ON disaster_applications FOR SELECT USING (true);
CREATE POLICY "允許認證用戶新增" ON disaster_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "允許用戶更新自己的申請" ON disaster_applications FOR UPDATE USING (auth.uid() = user_id);