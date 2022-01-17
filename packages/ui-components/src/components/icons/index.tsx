export * from './interface';
export * from './module';
export * from './markdown';

export type IconType = ({
  height,
  width,
  ...props
}: {
  // eslint-disable-next-line
  [x: string]: any;
  height?: number | undefined;
  width?: number | undefined;
}) => JSX.Element;
