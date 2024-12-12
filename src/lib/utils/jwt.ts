import jwt from 'jsonwebtoken';

const SECRET_KEY = 'votre_clé_secrète';

export const generateJWT = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role 
    },
    SECRET_KEY,
    { expiresIn: '24h' }
  );
};

export const verifyJWT = (token: string) => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
};