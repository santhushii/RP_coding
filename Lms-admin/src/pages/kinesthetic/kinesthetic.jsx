import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import PageHeaderWidgets from '@/components/shared/pageHeader/PageHeaderWidgets';
import Footer from '@/components/shared/Footer';
import KinestheticTable from '@/components/kinesthetic/kinestheticTable';

const Kinesthetic = () => {
    return (
        <>
            <PageHeader>
                <PageHeaderWidgets addNewLink="/admin/kinesthetic/create" name="Add New kinesthetic Lecture" />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <KinestheticTable title="kinesthetic List" />
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Kinesthetic;
