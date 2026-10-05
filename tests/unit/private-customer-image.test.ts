import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/lib/firebase', () => ({ auth: {}, storage: { app: { options: { storageBucket: 'private.test' } } } }));
import { customerPhotoPath } from '../../src/app/components/customers/PrivateCustomerImage';

describe('Fotos privadas: resolução de caminhos sem fallback público', () => {
  it.each([
    'gs://private.test/users/owner/customers/photo.png',
    'https://firebasestorage.googleapis.com/v0/b/private.test/o/users%2Fowner%2Fcustomers%2Fphoto.png?alt=media&token=secret',
    'https://cdn.luisices.com.br/users/owner/customers/photo.png',
  ])('resolve foto legada ou privada %s para o SDK autenticado', (url) => {
    expect(customerPhotoPath(url)).toBe('users/owner/customers/photo.png');
  });
  it.each([
    'gs://foreign.test/users/owner/customers/photo.png',
    'https://firebasestorage.googleapis.com/v0/b/foreign.test/o/users%2Fowner%2Fcustomers%2Fphoto.png',
    'https://cdn.luisices.com.br.evil.test/users/owner/customers/photo.png',
    'https://evil.test/users/owner/customers/photo.png',
    'gs://private.test/users/owner/products/photo.png',
    'javascript:alert(1)',
  ])('rejeita origem ou caminho inválido %s', (url) => {
    expect(customerPhotoPath(url)).toBeNull();
  });
});
