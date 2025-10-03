import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing environment variables:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SERVICE_ROLE_KEY
  })
}

// 使用 Service Role Key 來繞過 RLS 並自動確認用戶
const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

const DEFAULT_PASSWORD = '94800552'

interface BulkRegisterUser {
  email: string
  name: string
}

interface UserResult {
  index: number
  email: string
  name: string
  success: boolean
  message: string
  user_id: string | null
}

export async function POST(request: NextRequest) {
  try {
    // 檢查環境變數
    if (!supabaseAdmin) {
      console.error('Supabase Admin not initialized')
      return NextResponse.json(
        {
          error: 'Server configuration error',
          details: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable'
        },
        { status: 500 }
      )
    }

    const body = await request.json()

    if (!body.users || !Array.isArray(body.users)) {
      return NextResponse.json(
        { error: 'Users array is required' },
        { status: 400 }
      )
    }

    const users: BulkRegisterUser[] = body.users
    const results: UserResult[] = []
    let successCount = 0
    let errorCount = 0

    // 批量處理每個用戶
    for (let index = 0; index < users.length; index++) {
      const userData = users[index]
      const result: UserResult = {
        index,
        email: userData.email || '',
        name: userData.name || '',
        success: false,
        message: '',
        user_id: null
      }

      try {
        // 驗證必要欄位
        if (!userData.email || !userData.name) {
          throw new Error('Email and name are required')
        }

        // 使用 Admin API 創建用戶並自動確認
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,  // 自動確認 email
          user_metadata: {
            full_name: userData.name
          }
        })

        if (error) {
          // 處理已存在的用戶
          if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            result.message = 'User already exists'
            result.success = false
          } else {
            throw error
          }
        } else if (data.user) {
          result.user_id = data.user.id
          result.success = true
          result.message = 'User created and confirmed successfully'
          successCount++
        }

      } catch (error) {
        result.message = error instanceof Error ? error.message : 'Unknown error'
        errorCount++
      }

      results.push(result)
    }

    // 返回批量處理結果
    return NextResponse.json({
      success: true,
      total: users.length,
      success_count: successCount,
      error_count: errorCount,
      results,
      summary: {
        total_processed: users.length,
        successfully_created: successCount,
        errors: errorCount,
        default_password: DEFAULT_PASSWORD
      }
    })

  } catch (error) {
    console.error('Bulk register error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
