// Script to properly set up user roles
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hgcevucxmpapdkwjuzka.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnY2V2dWN4bXBhcGRrd2p1emthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNzkyOTAsImV4cCI6MjA3Njc1NTI5MH0.0VsNy_FYicFuqC1jVAZWOf6hNFLvulUeNm-exCgcE0k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupUserRoles() {
  try {
    console.log('🔍 Setting up proper user roles...');
    
    // First, let's see what users exist
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Error getting current user:', error);
      return;
    }
    
    if (!user) {
      console.log('❌ No user logged in. Please log in first.');
      return;
    }
    
    console.log('Current user:', user.email);
    
    // Determine role based on email
    let role = 'user';
    let subscriptionTier = 'free';
    let tokenLimit = 3500;
    
    if (user.email === 'owenhudsondesign@gmail.com') {
      role = 'admin';
      subscriptionTier = 'premium';
      tokenLimit = 50000;
      console.log('✅ Setting up ADMIN account for:', user.email);
    } else if (user.email === 'hudsonowenr@gmail.com') {
      role = 'user';
      subscriptionTier = 'free';
      tokenLimit = 3500;
      console.log('✅ Setting up USER account for:', user.email);
    } else {
      console.log('⚠️ Unknown email, setting as regular user:', user.email);
    }
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (existingProfile) {
      console.log('Profile already exists, updating role...');
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          role: role,
          subscription_tier: subscriptionTier,
          monthly_token_limit: tokenLimit,
          subscription_status: subscriptionTier === 'premium' ? 'active' : 'free'
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
      } else {
        console.log('✅ Updated profile:', updatedProfile);
      }
    } else {
      console.log('Creating new profile...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          full_name: user.email === 'owenhudsondesign@gmail.com' ? 'Owen Hudson (Admin)' : 'Owen Hudson',
          subscription_tier: subscriptionTier,
          subscription_status: subscriptionTier === 'premium' ? 'active' : 'free',
          monthly_token_limit: tokenLimit,
          role: role,
          email_updates_enabled: true,
          email_updates_frequency: 'weekly'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating profile:', createError);
      } else {
        console.log('✅ Created profile:', newProfile);
      }
    }
    
    console.log(`🎉 Setup complete! Role: ${role}, Tier: ${subscriptionTier}, Tokens: ${tokenLimit}`);
    
    if (role === 'admin') {
      console.log('🔑 You now have admin access! Visit /admin to upload URLs');
    } else {
      console.log('👤 You have regular user access');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

setupUserRoles();
