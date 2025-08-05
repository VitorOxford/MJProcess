export type Profile = {
  id: string;
  updated_at: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: 'admin' | 'vendedor' | 'designer' | 'producao' | 'user'; // Adicione outras roles se necessário
};
