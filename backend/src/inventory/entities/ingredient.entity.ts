import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  VersionColumn,
} from 'typeorm';

@Entity('ingredients')
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  unit: string;

  // So luong nguyen lieu hien co trong kho
  @Column('double precision', { default: 0 })
  stock: number;

  // So luong dang duoc giu cho cac don hang
  @Column('double precision', { default: 0 })
  reservedStock: number;

  @VersionColumn()
  version: number;
}