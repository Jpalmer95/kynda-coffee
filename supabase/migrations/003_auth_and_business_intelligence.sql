-- Auth and role management
-- Run after 001 and 002

-- User profiles with roles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'team' CHECK (role IN ('owner', 'manager', 'team')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Owners can read all profiles
CREATE POLICY "Owners read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Business metrics / KPIs
CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  revenue_cents INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  avg_order_cents INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  online_orders INTEGER DEFAULT 0,
  pos_orders INTEGER DEFAULT 0,
  top_product_id UUID REFERENCES products(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(metric_date)
);

-- AI recommendations / nudges
CREATE TABLE IF NOT EXISTS ai_nudges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('marketing', 'operations', 'growth', 'kaizen', 'encouragement')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Team training modules
CREATE TABLE IF NOT EXISTS training_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'onboarding', 'opening', 'closing', 'drinks', 'food',
    'equipment', 'safety', 'customer_service', 'maintenance'
  )),
  content TEXT NOT NULL, -- Markdown content
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training completions (who completed what)
CREATE TABLE IF NOT EXISTS training_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(module_id, user_id)
);

-- Checklists (opening, closing, maintenance)
CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('opening', 'closing', 'daily', 'weekly', 'monthly', 'maintenance')),
  items JSONB NOT NULL DEFAULT '[]', -- [{text, order, is_critical}]
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist completion log
CREATE TABLE IF NOT EXISTS checklist_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL REFERENCES user_profiles(id),
  completed_items JSONB NOT NULL DEFAULT '[]', -- indices of completed items
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Marketing content library
CREATE TABLE IF NOT EXISTS marketing_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'caption', 'hashtag_set', 'template')),
  platform TEXT CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'email', 'sms', 'all')),
  title TEXT NOT NULL,
  content TEXT, -- caption text, hashtag list, or description
  media_urls TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}', -- 'seasonal', 'promo', 'product', etc.
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'used', 'archived')),
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_nudges_status ON ai_nudges(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_marketing_content_status ON marketing_content(status);
CREATE INDEX IF NOT EXISTS idx_marketing_content_tags ON marketing_content USING gin(tags);

-- RLS for team-accessible tables
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_nudges ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read training
CREATE POLICY "Authenticated read training" ON training_modules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read checklists" ON checklists FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can manage their own completions
CREATE POLICY "Users manage own completions" ON training_completions
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own checklist completions" ON checklist_completions
  FOR ALL USING (completed_by = auth.uid());

-- Owner/manager access to everything
CREATE POLICY "Owners full access metrics" ON business_metrics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
CREATE POLICY "Owners full access nudges" ON ai_nudges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
CREATE POLICY "Owners full access marketing" ON marketing_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
