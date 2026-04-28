
import { useTranslation } from "react-i18next";

export const Footer = () =>
{
  const { t } = useTranslation();

  return (
    <footer id="myFooter" className="footer mt-auto py-3 purple-bg">
      <div className="container text-center">
        <span className="text-white">{t("footer.copyright")}</span>
      </div>
    </footer>
  );
};
