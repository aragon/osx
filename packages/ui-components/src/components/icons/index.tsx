export * from './interface';
export * from './module';

export type IconType = ({
  height,
  width,
  ...props
}: {
  [x: string]: any;
  height?: number | undefined;
  width?: number | undefined;
}) => JSX.Element;
