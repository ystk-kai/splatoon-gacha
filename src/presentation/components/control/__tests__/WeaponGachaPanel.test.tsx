import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeaponGachaPanel } from '../WeaponGachaPanel';
import { Weapon } from '@domain/entities/Weapon';

// Mock the repository and use case
vi.mock('@infrastructure/repositories/WeaponRepository', () => ({
  WeaponRepository: vi.fn().mockImplementation(() => ({
    findByFilter: vi.fn().mockResolvedValue([
      Weapon.create({
        id: 'test_weapon',
        name: 'テスト武器',
        type: 'shooter',
        subWeapon: 'splat_bomb',
        specialWeapon: 'big_bubbler',
        specialPoints: 200,
      }),
    ]),
    findAll: vi.fn().mockResolvedValue([
      Weapon.create({
        id: 'test_weapon',
        name: 'テスト武器',
        type: 'shooter',
        subWeapon: 'splat_bomb',
        specialWeapon: 'big_bubbler',
        specialPoints: 200,
      }),
    ]),
  })),
}));

describe('WeaponGachaPanel', () => {
  const mockOnWeaponSelected = vi.fn();
  const mockSetIsSpinning = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('コンポーネントが正しくレンダリングされる', () => {
    render(
      <WeaponGachaPanel
        onWeaponSelected={mockOnWeaponSelected}
        isSpinning={false}
        setIsSpinning={mockSetIsSpinning}
      />
    );

    expect(screen.getByText('武器ガチャ')).toBeInTheDocument();
    expect(screen.getByText('武器ガチャを回す！')).toBeInTheDocument();
  });

  it('カスタムモードの切り替えができる', async () => {
    const user = userEvent.setup();
    
    render(
      <WeaponGachaPanel
        onWeaponSelected={mockOnWeaponSelected}
        isSpinning={false}
        setIsSpinning={mockSetIsSpinning}
      />
    );

    const customModeCheckbox = screen.getByLabelText(/カスタムモード/);
    expect(customModeCheckbox).not.toBeChecked();

    await user.click(customModeCheckbox);
    expect(customModeCheckbox).toBeChecked();
  });

  it('武器タイプフィルターが選択できる', async () => {
    const user = userEvent.setup();
    
    render(
      <WeaponGachaPanel
        onWeaponSelected={mockOnWeaponSelected}
        isSpinning={false}
        setIsSpinning={mockSetIsSpinning}
      />
    );

    const shooterButton = screen.getByText('シューター');
    await user.click(shooterButton);

    // ボタンのクラスが変更されることを確認
    expect(shooterButton.className).toContain('bg-splatoon-orange');
  });

  it('ガチャボタンをクリックするとスピン状態になる', () => {
    render(
      <WeaponGachaPanel
        onWeaponSelected={mockOnWeaponSelected}
        isSpinning={false}
        setIsSpinning={mockSetIsSpinning}
      />
    );

    const gachaButton = screen.getByText('武器ガチャを回す！');
    fireEvent.click(gachaButton);

    expect(mockSetIsSpinning).toHaveBeenCalledWith(true);
  });

  it('スピン中はボタンが無効になる', () => {
    render(
      <WeaponGachaPanel
        onWeaponSelected={mockOnWeaponSelected}
        isSpinning={true}
        setIsSpinning={mockSetIsSpinning}
      />
    );

    const gachaButton = screen.getByRole('button', { name: /抽選中/ });
    expect(gachaButton).toBeDisabled();
    expect(screen.getByText('抽選中...')).toBeInTheDocument();
  });

  it('初期状態では武器タイプフィルターが表示される', () => {
    render(
      <WeaponGachaPanel
        onWeaponSelected={mockOnWeaponSelected}
        isSpinning={false}
        setIsSpinning={mockSetIsSpinning}
      />
    );

    expect(screen.getByText('武器タイプフィルター')).toBeInTheDocument();
  });
});