interface Props {
  dataUrl: string;
  label: string;
}

export function CustomSvgNode({ dataUrl, label }: Props) {
  return (
    <>
      <image href={dataUrl} x={-24} y={-24} width={48} height={48} />
      <text x={0} y={38} textAnchor="middle" fontSize={9} fill="#333">
        {label}
      </text>
    </>
  );
}
