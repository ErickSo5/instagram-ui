use anchor_lang::prelude::*;

declare_id!("H3PZAD7wwkgGQhYLJBABfW376oAaZVrwmYoErRYuf9yj");

#[program]
pub mod instagram_test {
    use super::*;

    // Crear perfil
    pub fn create_profile(ctx: Context<CreateProfile>, username: String) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.author = ctx.accounts.user.key();
        profile.username = username;
        profile.last_post_id = 0;
        profile.bump = ctx.bumps.profile;
        Ok(())
    }

    // Crear post
    pub fn create_post(ctx: Context<CreatePost>, content: String) -> Result<()> {
        let profile = &mut ctx.accounts.profile;

        // Calculamos el próximo post_id antes de modificar profile
        let next_post_id = profile
            .last_post_id
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        let post = &mut ctx.accounts.post;
        post.author = ctx.accounts.user.key();
        post.post_id = next_post_id;
        post.content = content;
        post.like_count = 0;
        post.bump = ctx.bumps.post;

        // Actualizamos last_post_id después de crear el post
        profile.last_post_id = next_post_id;

        Ok(())
    }

    // Dar like
    pub fn like_post(ctx: Context<LikePost>) -> Result<()> {
        let like = &mut ctx.accounts.like;
        like.post = ctx.accounts.post.key();
        like.user = ctx.accounts.user.key();
        like.bump = ctx.bumps.like;

        let post = &mut ctx.accounts.post;
        post.like_count = post
            .like_count
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
        Ok(())
    }
}

// ---------------- Accounts ----------------

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + Profile::SIZE,
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, Profile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePost<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, Profile>,
    #[account(
        init,
        payer = user,
        space = 8 + Post::SIZE,
        seeds = [b"post", user.key().as_ref(), &profile.last_post_id.checked_add(1).unwrap().to_le_bytes()],
        bump
    )]
    pub post: Account<'info, Post>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LikePost<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"post", post.author.as_ref(), &post.post_id.to_le_bytes()],
        bump = post.bump
    )]
    pub post: Account<'info, Post>,
    #[account(
        init,
        payer = user,
        space = 8 + Like::SIZE,
        seeds = [b"like", post.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub like: Account<'info, Like>,
    pub system_program: Program<'info, System>,
}

// ---------------- State ----------------

#[account]
pub struct Profile {
    pub author: Pubkey,
    pub username: String,
    pub last_post_id: u64,
    pub bump: u8,
}

impl Profile {
    pub const SIZE: usize = 32 + (4 + 32) + 8 + 1;
}

#[account]
pub struct Post {
    pub author: Pubkey,
    pub post_id: u64,
    pub content: String,
    pub like_count: u64,
    pub bump: u8,
}

impl Post {
    pub const SIZE: usize = 32 + 8 + (4 + 280) + 8 + 1;
}

#[account]
pub struct Like {
    pub post: Pubkey,
    pub user: Pubkey,
    pub bump: u8,
}

impl Like {
    pub const SIZE: usize = 32 + 32 + 1;
}

// ---------------- Errors ----------------

#[error_code]
pub enum ErrorCode {
    #[msg("Overflow aritmético")]
    Overflow,
}
