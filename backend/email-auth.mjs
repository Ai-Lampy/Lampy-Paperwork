/* Restricted in-app email-code sign-in. Existing R2 owner IDs remain unchanged. */
import {betterAuth} from 'better-auth';
import {emailOTP} from 'better-auth/plugins/email-otp';
const instances=new WeakMap();
export function authOptions(env){
 if(!env.AUTH_DB||!env.AUTH_SECRET||env.AUTH_SECRET.length<32||!env.AUTH_URL||!env.ALLOWED_EMAIL)throw Error('Email sign-in is not configured.');
 const base=new URL(env.AUTH_URL),app=new URL(env.APP_URL);
 if(base.protocol!=='https:'||app.protocol!=='https:')throw Error('Account URLs require HTTPS.');
 return {
  appName:'Lampy Paperwork',database:env.AUTH_DB,secret:env.AUTH_SECRET,
  baseURL:base.origin,basePath:(env.API_PREFIX||'/paperwork/account-api')+'/auth',
  trustedOrigins:[app.origin],logger:{disabled:true},emailAndPassword:{enabled:false},
  plugins:[emailOTP({disableSignUp:true,otpLength:6,expiresIn:300,allowedAttempts:3,storeOTP:'hashed',resendStrategy:'rotate',
   async sendVerificationOTP({email,otp,type}){
    if(type!=='sign-in'||email.toLowerCase()!==env.ALLOWED_EMAIL.toLowerCase())return;
    if(!env.EMAIL||!env.EMAIL_FROM)throw Error('Sign-in email is not configured.');
    await env.EMAIL.send({from:{email:env.EMAIL_FROM,name:'Lampy Paperwork'},to:email,subject:'Your Lampy Paperwork sign-in code',text:'Your Lampy Paperwork sign-in code is: '+otp+'\n\nEnter this code in Lampy Paperwork. It expires in 5 minutes and can be used once. If you did not request it, ignore this email.'});
   }})],
  session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
  advanced:{useSecureCookies:true,cookiePrefix:'lampy',defaultCookieAttributes:{httpOnly:true,secure:true,sameSite:'lax'},ipAddress:{ipAddressHeaders:['cf-connecting-ip']}},
  rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{'/sign-in/email-otp':{window:60,max:5},'/email-otp/send-verification-otp':{window:300,max:3}}}
 };
}
export function createEmailAuth(env){
 // The Worker configuration/bindings are immutable for a deployed isolate.
 // Reuse initialization without caching sessions or bypassing D1 validation.
 let auth=instances.get(env.AUTH_DB);if(!auth){auth=betterAuth(authOptions(env));instances.set(env.AUTH_DB,auth)}return auth;
}
