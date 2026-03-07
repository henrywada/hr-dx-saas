'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server-user';

export type SubmitSurveyInput = {
  answers: { question_id: string; score: number }[];
  freeComment?: string;
  mockQuestionsData?: { id: string; category: string; text: string }[];
};

export async function submitSurvey(data: SubmitSurveyInput) {
  try {
    const user = await getServerUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: '認証エラー：ユーザーまたはテナント情報が取得できません。' };
    }

    const supabase = await createClient();

    // ※※【特例処理】: モックの質問IDの外部キー制約エラーを回避するため、
    // 未登録のIDであれば質問マスタ(survey_questions)に仮データとして挿入する処理
    if (data.mockQuestionsData && data.mockQuestionsData.length > 0) {
      // @ts-expect-error type not updated
      const { data: existingQA } = await supabase
        .from('survey_questions')
        .select('id')
        .eq('tenant_id', user.tenant_id)
        .limit(1);

      if (!existingQA || existingQA.length === 0) {
        const seedData = data.mockQuestionsData.map((q) => ({
          id: q.id,
          tenant_id: user.tenant_id,
          category: q.category,
          content: q.text,
          is_active: true,
        }));
        // @ts-expect-error type not updated
        await supabase.from('survey_questions').insert(seedData).select();
      }
    }

    // 回答データの作成
    // (フリーテキストのコメントは、データ整理のため最初の質問回答レコードにのみ付与するか、
    // あるいはDB定義がすべてのレコードに許容しているため全体に一括設定または分散する等がありますが、
    // 今回は最後のレコードに代表して1つだけコメントを持たせます)
    const records = data.answers.map((ans, index) => ({
      tenant_id: user.tenant_id,
      user_id: user.id,
      question_id: ans.question_id,
      score: ans.score,
      comment: index === data.answers.length - 1 ? data.freeComment : null,
    }));

    // バルクインサート (一括保存)
    // @ts-expect-error type not updated
    const { error } = await supabase.from('survey_responses').insert(records);

    if (error) {
      console.error('Submit survey error:', error);
      return { success: false, error: 'データベースへの保存に失敗しました。' };
    }

    return { success: true };
  } catch (error) {
    console.error('Submit survey Exception:', error);
    return { success: false, error: '予期せぬエラーが発生しました。' };
  }
}
