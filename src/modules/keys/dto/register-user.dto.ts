import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const B64_RE = /^[A-Za-z0-9+/=]+$/;

export class RegisterUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username!: string;

  @IsString()
  @Matches(B64_RE)
  identityPublicKey!: string;

  @IsString()
  @Matches(B64_RE)
  signingPublicKey!: string;

  @IsString()
  @Matches(B64_RE)
  signedPreKeyPublic!: string;

  @IsString()
  @Matches(B64_RE)
  signedPreKeySignature!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Matches(B64_RE, { each: true })
  oneTimePreKeys!: string[];
}
